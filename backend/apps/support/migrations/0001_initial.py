from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('human_takeover', models.BooleanField(default=False)),
                ('admin_unread', models.IntegerField(default=0)),
                ('user_unread', models.IntegerField(default=0)),
                ('last_message_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='chat_session', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-last_message_at']},
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('role', models.CharField(choices=[('user','User'),('ai','AI'),('admin','Admin')], max_length=10)),
                ('content', models.TextField()),
                ('escalate', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='support.chatsession')),
            ],
            options={'ordering': ['created_at']},
        ),
    ]
