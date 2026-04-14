from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0003_sitecontent'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClipThumbnail',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image_path', models.CharField(max_length=300)),
                ('title', models.CharField(blank=True, max_length=200)),
                ('category', models.CharField(blank=True, max_length=80)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['order', '-created_at']},
        ),
    ]
