import time
from threading import Thread
from flask import current_app
from flask_login import current_user

class TokenRefreshService:
    def __init__(self, app):
        self.app = app
        self.running = False
        self.thread = None
        
    def start(self):
        """Start automatic token refresh service"""
        if not current_app.config.get('AUTO_REFRESH_ENABLED', True):
            return
            
        self.running = True
        self.thread = Thread(target=self._refresh_loop)
        self.thread.daemon = True
        self.thread.start()
        
    def stop(self):
        """Stop automatic token refresh service"""
        self.running = False
        if self.thread:
            self.thread.join()
            
    def _refresh_loop(self):
        """Background thread to refresh tokens automatically"""
        with self.app.app_context():
            while self.running:
                try:
                    # Refresh every 30 minutes (adjust as needed)
                    time.sleep(1800)
                    
                    if current_user.is_authenticated:
                        # Make API call to refresh endpoint
                        with self.app.test_client() as client:
                            client.post('/api/auth/refresh', 
                                      headers={'Content-Type': 'application/json'},
                                      json={})
                            
                except Exception as e:
                    current_app.logger.error(f"Token refresh error: {e}")
                    time.sleep(60)  # Wait 1 minute on error