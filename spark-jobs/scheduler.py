# spark-jobs/update_scheduler.py

import schedule
import time
import subprocess
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("/opt/spark-jobs/spark_scheduler.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SparkScheduler")

# Path to Spark submit
SPARK_SUBMIT = "/opt/bitnami/spark/bin/spark-submit"
SPARK_MASTER = os.environ.get("SPARK_MASTER_URL", "spark://spark-master:7077")

# Job definitions - UPDATED to include discover feed generator
JOBS = {
    "trend_analysis": {
        "script": "trend_analysis.py",
        "schedule": "*/30 * * * *",  # Every 30 minutes
        "description": "Analyze trending hashtags and topics"
    },
    "user_recommender": {
        "script": "user_recommender.py",
        "schedule": "0 */3 * * *",  # Every 3 hours
        "description": "Generate user recommendations"
    },
    "content_analyzer": {
        "script": "content_analyzer.py",
        "schedule": "0 2 * * *",  # Once a day at 2 AM
        "description": "Analyze tweet content and topics"
    },
    "discover_feed_generator": {
        "script": "discover_feed_generator.py",
        "schedule": "*/15 * * * *",  # Every 15 minutes
        "description": "Generate discover feed recommendations"
    }
}

# The rest of the file remains the same as in paste-5.txt
def run_spark_job(job_name):
    """Run a Spark job using spark-submit"""
    job = JOBS.get(job_name)
    if not job:
        logger.error(f"Unknown job: {job_name}")
        return
    
    script_path = os.path.join("/opt/spark-jobs", job["script"])
    
    logger.info(f"Starting job: {job_name} - {job['description']}")
    start_time = time.time()
    
    try:
        # Run spark-submit with detailed configuration
        cmd = [
            SPARK_SUBMIT,
            "--master", SPARK_MASTER,
            "--packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1",
            "--conf", "spark.mongodb.input.uri=mongodb://mongodb:27017/mini_twitter",
            "--conf", "spark.mongodb.output.uri=mongodb://mongodb:27017/mini_twitter_analytics",
            "--conf", "spark.driver.memory=1g",
            "--conf", "spark.executor.memory=1g",
            script_path
        ]
        logger.info(f"Running command: {' '.join(cmd)}")
        
        # Execute the command with real-time logging
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Log output in real-time
        stdout_lines = []
        stderr_lines = []
        
        # Process stdout
        for line in process.stdout:
            line = line.strip()
            stdout_lines.append(line)
            logger.info(f"[{job_name}] {line}")
        
        # Process stderr
        for line in process.stderr:
            line = line.strip()
            stderr_lines.append(line)
            logger.error(f"[{job_name}] {line}")
        
        # Wait for process to complete
        return_code = process.wait()
        
        if return_code == 0:
            logger.info(f"Job {job_name} completed successfully")
        else:
            logger.error(f"Job {job_name} failed with exit code {return_code}")
            
    except Exception as e:
        logger.error(f"Failed to run job {job_name}: {str(e)}")
    
    duration = time.time() - start_time
    logger.info(f"Job {job_name} duration: {duration:.2f} seconds")

def setup_schedules():
    """Set up job schedules based on cron expressions"""
    logger.info("Setting up job schedules")
    
    for job_name, job_info in JOBS.items():
        cron_schedule = job_info["schedule"]
        
        if "*/" in cron_schedule:
            # For expressions like "*/30 * * * *" (every 30 minutes)
            parts = cron_schedule.split()
            if parts[0].startswith("*/"):
                interval = int(parts[0].replace("*/", ""))
                schedule.every(interval).minutes.do(run_spark_job, job_name)
                logger.info(f"Scheduled {job_name} to run every {interval} minutes")
            elif parts[1].startswith("*/"):
                interval = int(parts[1].replace("*/", ""))
                schedule.every(interval).hours.do(run_spark_job, job_name)
                logger.info(f"Scheduled {job_name} to run every {interval} hours")
        elif cron_schedule.startswith("0 "):
            # For expressions like "0 2 * * *" (daily at 2am)
            parts = cron_schedule.split()
            hour = int(parts[1])
            schedule.every().day.at(f"{hour:02d}:00").do(run_spark_job, job_name)
            logger.info(f"Scheduled {job_name} to run daily at {hour:02d}:00")
        else:
            logger.warning(f"Unsupported schedule format for {job_name}: {cron_schedule}")
    
    logger.info("All jobs scheduled")

def main():
    """Main function for the scheduler"""
    logger.info("Starting Mini Twitter Spark Scheduler")
    
    # Wait for services to be ready
    logger.info("Waiting for services to be ready...")
    time.sleep(30)
    
    # Set up job schedules
    setup_schedules()
    
    # Run each job once at startup to initialize data
    logger.info("Running initial job executions...")
    for job_name in JOBS:
        run_spark_job(job_name)
    
    # Run the scheduler
    logger.info("Scheduler running. Press Ctrl+C to exit.")
    
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
            break
        except Exception as e:
            logger.error(f"Scheduler error: {str(e)}")
            time.sleep(300)  # Wait 5 minutes before continuing after an error

if __name__ == "__main__":
    main()