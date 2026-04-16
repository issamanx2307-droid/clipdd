from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0005_clipthumbnail_file_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Article',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=300)),
                ('slug', models.SlugField(allow_unicode=True, max_length=300, unique=True)),
                ('excerpt', models.TextField(blank=True)),
                ('content', models.TextField()),
                ('category', models.CharField(blank=True, max_length=100)),
                ('cat_color', models.CharField(default='#FF7A00', max_length=20)),
                ('cover_bg', models.CharField(default='linear-gradient(135deg,#FFF7ED,#FED7AA)', max_length=200)),
                ('read_time', models.CharField(default='5 นาที', max_length=30)),
                ('meta_title', models.CharField(blank=True, max_length=200)),
                ('meta_description', models.CharField(blank=True, max_length=300)),
                ('is_published', models.BooleanField(default=False)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-published_at', '-created_at'],
            },
        ),
    ]
