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
        logging.FileHandler("spark_scheduler.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SparkScheduler")

# Path to Spark submit
SPARK_SUBMIT = "/opt/bitnami/spark/bin/spark-submit"

# Job definitions
JOBS = {
    "trend_analysis": {
        "script": "trend_analysis.py",
        "schedule": "0 */3 * * *",  # Every 3 hours
        "description": "Analyze trending hashtags and topics"
    },
    "user_recommender": {
        "script": "user_recommender.py",
        "schedule": "0 */12 * * *",  # Twice a day
        "description": "Generate user recommendations"
    },
    "content_analyzer": {
        "script": "content_analyzer.py",
        "schedule": "0 0 * * *",  # Once a day at midnight
        "description": "Analyze tweet content and topics"
    }
}

def run_spark_job(job_name):
    """Run a Spark job using spark-submit"""
    job = JOBS.get(job_name)
    if not job:
        logger.error(f"Unknown job: {job_name}")
        return
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), job["script"])
    
    logger.info(f"Starting job: {job_name} - {job['description']}")
    start_time = time.time()
    
    try:
        # Run spark-submit
        cmd = [SPARK_SUBMIT, "--master", "spark://spark-master:7077", script_path]
        logger.info(f"Running command: {' '.join(cmd)}")
        
        # Execute the command
        result = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        
        # Log the output
        logger.info(f"Job {job_name} completed successfully")
        logger.debug(f"Output: {result.stdout}")
        
        if result.stderr:
            logger.warning(f"Stderr: {result.stderr}")
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Job {job_name} failed with exit code {e.returncode}")
        logger.error(f"Error: {e.stderr}")
    except Exception as e:
        logger.error(f"Failed to run job {job_name}: {str(e)}")
    
    duration = time.time() - start_time
    logger.info(f"Job {job_name} duration: {duration:.2f} seconds")

def setup_schedules():
    """Set up job schedules"""
    for job_name, job_config in JOBS.items():
        # Parse cron-style schedule into components
        schedule_parts = job_config["schedule"].split()
        
        # Extract hour and minute
        minute = schedule_parts[0]
        hour = schedule_parts[1]
        
        # For simplicity, just handle the */n format
        if hour.startswith('*/'):
            interval = int(hour[2:])
            for h in range(0, 24, interval):
                schedule.every().day.at(f"{h:02d}:{minute}").do(run_spark_job, job_name)
        else:
            schedule.every().day.at(f"{hour.zfill(2)}:{minute.zfill(2)}").do(run_spark_job, job_name)
            
        logger.info(f"Scheduled job {job_name} with schedule: {job_config['schedule']}")

def main():
    """Main function for the scheduler"""
    logger.info("Starting Mini Twitter Spark Scheduler")
    
    # Set up job schedules
    setup_schedules()
    
    # Also run each job once at startup
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