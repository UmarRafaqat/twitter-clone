# This file makes the 'processors' directory a Python package
# It allows importing modules directly from the 'processors' package

# Import all processor modules to make them available from the package
from . import user_processor
from . import tweet_processor
from . import interaction_processor
from . import analytics_processor