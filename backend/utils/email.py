from flask_mail import Message
from flask import current_app
from threading import Thread
from extensions import mail
import logging

logger = logging.getLogger(__name__)

def send_async_email(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
            logger.info(f"Email sent successfully to {msg.recipients}")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")

def send_email(to, subject, template, **kwargs):
    try:
        # In a real implementation, you would use a template system like Jinja2
        # For simplicity, we'll just create a simple text email
        if template == 'welcome':
            body = f"""
            Welcome to StudyBuddy, {kwargs.get('username', 'there')}!
            
            We're excited to have you on board. StudyBuddy helps you connect with other students,
            join study groups, and achieve your academic goals together.
            
            Happy studying!
            The StudyBuddy Team
            """
        elif template == 'password_reset':
            body = f"""
            Your password reset code is: {kwargs.get('code', '')}
            
            This code will expire in 15 minutes. If you didn't request this reset, please ignore this email.
            
            Best regards,
            The StudyBuddy Team
            """
        else:
            body = f"""
            {subject}
            
            This is a default email template.
            """
        
        msg = Message(
            subject=subject,
            recipients=[to],
            body=body,
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        # Send email asynchronously
        Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()
        return True
        
    except Exception as e:
        logger.error(f"Error preparing email: {str(e)}")
        return False