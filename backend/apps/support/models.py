from django.db import models
from apps.users.models import User


class SiteContent(models.Model):
    key = models.CharField(max_length=80, unique=True)
    content = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']

    def __str__(self):
        return f'SiteContent({self.key})'


class ChatSession(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='chat_session')
    human_takeover = models.BooleanField(default=False)
    admin_unread = models.IntegerField(default=0)   # messages admin hasn't seen
    user_unread = models.IntegerField(default=0)    # admin replies user hasn't seen
    last_message_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_message_at']

    def __str__(self):
        return f"Chat({self.user.email})"


class ChatMessage(models.Model):
    ROLE = [('user', 'User'), ('ai', 'AI'), ('admin', 'Admin')]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE)
    content = models.TextField()
    escalate = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
