from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from pymongo import MongoClient
from cassandra.cluster import Cluster
import psycopg2
import psycopg2.extras
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

# Create router
router = APIRouter(prefix="/db", tags=["database"])

# Configuration from environment variables
DB_URL = os.getenv("DATABASE_URL", "postgresql://mini_twitter:password@postgres:5432/mini_twitter")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017/mini_twitter")
CASSANDRA_HOSTS = os.getenv("CASSANDRA_HOSTS", "localhost").split(",")

# Database connection dependencies
def get_pg_conn():
    try:
        conn = psycopg2.connect(DB_URL)
        yield conn
    finally:
        conn.close()

def get_mongo_client():
    try:
        client = MongoClient(MONGODB_URL)
        yield client
    finally:
        client.close()

def get_cassandra_session():
    try:
        cluster = Cluster(CASSANDRA_HOSTS)
        session = cluster.connect()
        yield session
    finally:
        cluster.shutdown()

# Models
class PostgresQuery(BaseModel):
    query: str
    params: Optional[List[Any]] = None

class MongoFilter(BaseModel):
    filter: Dict[str, Any] = {}
    limit: int = 100
    skip: int = 0
    sort_by: Optional[str] = None
    sort_direction: int = -1  # -1 for descending, 1 for ascending

# PostgreSQL query endpoint
@router.post("/postgres", summary="Execute PostgreSQL query")
def execute_postgres_query(query_data: PostgresQuery, conn=Depends(get_pg_conn)):
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(query_data.query, query_data.params or [])
        if cursor.description:
            results = cursor.fetchall()
            for row in results:
                for key, value in row.items():
                    if isinstance(value, datetime):
                        row[key] = value.isoformat()
            return results
        else:
            conn.commit()
            return {"message": "Query executed successfully", "rows_affected": cursor.rowcount}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

# MongoDB basic collection access
@router.get("/mongodb/{collection}", summary="Get data from MongoDB collection")
def get_mongodb_data(collection: str, limit: int = 100, skip: int = 0, mongo_client=Depends(get_mongo_client)):
    try:
        db = mongo_client.mini_twitter
        if collection not in db.list_collection_names():
            raise HTTPException(status_code=404, detail=f"Collection '{collection}' not found")
        documents = list(db[collection].find().skip(skip).limit(limit))
        for doc in documents:
            doc['_id'] = str(doc.get('_id', ''))
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# MongoDB advanced query
@router.post("/mongodb/{collection}/find", summary="Advanced MongoDB query")
def query_mongodb_collection(collection: str, filter_data: MongoFilter, mongo_client=Depends(get_mongo_client)):
    try:
        db = mongo_client.mini_twitter
        if collection not in db.list_collection_names():
            raise HTTPException(status_code=404, detail=f"Collection '{collection}' not found")
        query = db[collection].find(filter_data.filter).skip(filter_data.skip).limit(filter_data.limit)
        if filter_data.sort_by:
            query = query.sort(filter_data.sort_by, filter_data.sort_direction)
        documents = list(query)
        for doc in documents:
            doc['_id'] = str(doc.get('_id', ''))
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ✅ MongoDB comments endpoint (NEW)
@router.get("/mongodb/comments", summary="Get comments from MongoDB")
def get_mongo_comments(
    tweet_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    mongo_client=Depends(get_mongo_client)
):
    """
    Get comments from MongoDB with optional filters:
    - tweet_id: filter by tweet
    - user_id: filter by user
    - parent_id: filter replies to a comment
    """
    try:
        collection = mongo_client.mini_twitter.comments
        query = {}
        if tweet_id:
            query["tweet_id"] = tweet_id
        if user_id:
            query["user_id"] = user_id
        if parent_id is not None:
            query["parent_id"] = parent_id
        comments = list(collection.find(query).skip(skip).limit(limit))
        for doc in comments:
            doc['_id'] = str(doc.get('_id', ''))
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

# Cassandra data fetch
@router.get("/cassandra/{keyspace}/{table}", summary="Get data from Cassandra table")
def get_cassandra_data(keyspace: str, table: str, limit: int = 100, cassandra_session=Depends(get_cassandra_session)):
    try:
        keyspaces = cassandra_session.execute("SELECT keyspace_name FROM system_schema.keyspaces")
        if not any(row.keyspace_name == keyspace for row in keyspaces):
            raise HTTPException(status_code=404, detail=f"Keyspace '{keyspace}' not found")
        cassandra_session.set_keyspace(keyspace)
        tables = cassandra_session.execute("SELECT table_name FROM system_schema.tables WHERE keyspace_name = %s", (keyspace,))
        if not any(row.table_name == table for row in tables):
            raise HTTPException(status_code=404, detail=f"Table '{table}' not found in keyspace '{keyspace}'")
        rows = cassandra_session.execute(f"SELECT * FROM {table} LIMIT {limit}")
        result = []
        for row in rows:
            row_dict = {}
            for key in row._fields:
                value = getattr(row, key)
                if hasattr(value, "isoformat"):
                    value = value.isoformat()
                row_dict[key] = value
            result.append(row_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# PostgreSQL schema explorer
@router.get("/postgres/schemas", summary="Get PostgreSQL schema information")
def get_postgres_schemas(conn=Depends(get_pg_conn)):
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
        """)
        tables = cursor.fetchall()
        schema_info = {}
        for table in tables:
            schema = table["table_schema"]
            name = table["table_name"]
            if schema not in schema_info:
                schema_info[schema] = {}
            schema_info[schema][name] = {
                "type": table["table_type"],
                "columns": []
            }
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """, (schema, name))
            columns = cursor.fetchall()
            schema_info[schema][name]["columns"] = columns
        return schema_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# MongoDB collections info
@router.get("/mongodb/collections", summary="Get MongoDB collections information")
def get_mongodb_collections(mongo_client=Depends(get_mongo_client)):
    try:
        db = mongo_client.mini_twitter
        collections = db.list_collection_names()
        result = {}
        for name in collections:
            stats = db.command("collstats", name)
            sample = list(db[name].find().limit(1))
            if sample:
                for doc in sample:
                    doc['_id'] = str(doc.get('_id', ''))
                    for k, v in doc.items():
                        if isinstance(v, datetime):
                            doc[k] = v.isoformat()
            result[name] = {
                "count": stats.get("count", 0),
                "size": stats.get("size", 0),
                "sample": sample[0] if sample else None,
                "indexes": stats.get("nindexes", 0)
            }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Cassandra keyspace explorer
@router.get("/cassandra/keyspaces", summary="Get Cassandra keyspaces information")
def get_cassandra_keyspaces(cassandra_session=Depends(get_cassandra_session)):
    try:
        keyspaces_rows = cassandra_session.execute("SELECT keyspace_name FROM system_schema.keyspaces")
        result = {}
        for ks in keyspaces_rows:
            keyspace = ks.keyspace_name
            if keyspace.startswith("system"):
                continue
            tables_rows = cassandra_session.execute(
                "SELECT table_name FROM system_schema.tables WHERE keyspace_name = %s", (keyspace,)
            )
            tables = {}
            for tbl in tables_rows:
                columns_rows = cassandra_session.execute(
                    "SELECT column_name, type FROM system_schema.columns WHERE keyspace_name = %s AND table_name = %s",
                    (keyspace, tbl.table_name)
                )
                columns = {col.column_name: col.type for col in columns_rows}
                tables[tbl.table_name] = columns
            result[keyspace] = tables
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
