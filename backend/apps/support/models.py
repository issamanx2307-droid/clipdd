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


class ClipThumbnail(models.Model):
    image_path = models.CharField(max_length=300)   # relative to MEDIA_ROOT
    file_type  = models.CharField(max_length=10, default='image')  # 'image' | 'video'
    title      = models.CharField(max_length=200, blank=True)
    category   = models.CharField(max_length=80,  blank=True)
    order      = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f'ClipThumbnail({self.title or self.image_path})'


class Article(models.Model):
    title            = models.CharField(max_length=300)
    slug             = models.SlugField(max_length=300, unique=True, allow_unicode=True)
    excerpt          = models.TextField(blank=True)
    content          = models.TextField()                 # HTML content
    category         = models.CharField(max_length=100, blank=True)
    cat_color        = models.CharField(max_length=20, default='#FF7A00')
    cover_bg         = models.CharField(max_length=200, default='linear-gradient(135deg,#FFF7ED,#FED7AA)')
    cover_image      = models.URLField(max_length=500, blank=True)
    read_time        = models.CharField(max_length=30, default='5 นาที')
    meta_title       = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    is_published     = models.BooleanField(default=False)
    published_at     = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return f'Article({self.slug})'


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
