from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient
from cassandra.cluster import Cluster
import psycopg2
import psycopg2.extras
import os
from typing import List, Dict, Any

router = APIRouter(prefix="/db", tags=["database"])

# Configuration from environment variables
DB_URL = os.getenv("DATABASE_URL", "postgresql://mini_twitter:password@postgres:5432/mini_twitter")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017/mini_twitter")
CASSANDRA_HOSTS = os.getenv("CASSANDRA_HOSTS", "localhost").split(",")

# Database connections
def get_pg_conn():
    conn = psycopg2.connect(DB_URL)
    try:
        yield conn
    finally:
        conn.close()

def get_mongo_client():
    client = MongoClient(MONGODB_URL)
    try:
        yield client
    finally:
        client.close()

def get_cassandra_session():
    cluster = Cluster(CASSANDRA_HOSTS)
    session = cluster.connect()
    try:
        yield session
    finally:
        cluster.shutdown()

class PostgresQuery(BaseModel):
    query: str

@router.post("/postgres")
def execute_postgres_query(query_data: PostgresQuery, conn = Depends(get_pg_conn)):
    """Execute a PostgreSQL query and return the results"""
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(query_data.query)
        
        # Check if this is a SELECT query
        if cursor.description:
            results = cursor.fetchall()
            return list(results)
        else:
            conn.commit()
            return [{"message": f"Query executed successfully. Rows affected: {cursor.rowcount}"}]
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/mongodb/{collection}")
def get_mongodb_data(collection: str, limit: int = 100, mongo_client = Depends(get_mongo_client)):
    """Get data from a MongoDB collection"""
    try:
        db = mongo_client.mini_twitter
        collection = db[collection]
        documents = list(collection.find({}).limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for doc in documents:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
        
        return documents
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/cassandra/{keyspace}/{table}")
def get_cassandra_data(keyspace: str, table: str, limit: int = 100, cassandra_session = Depends(get_cassandra_session)):
    """Get data from a Cassandra table"""
    try:
        cassandra_session.set_keyspace(keyspace)
        rows = cassandra_session.execute(f"SELECT * FROM {table} LIMIT {limit}")
        
        # Convert to list of dicts
        result = []
        for row in rows:
            row_dict = {}
            for key in row._fields:
                value = getattr(row, key)
                # Handle non-serializable types
                if hasattr(value, 'isoformat'):  # For datetime objects
                    value = value.isoformat()
                row_dict[key] = value
            result.append(row_dict)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
