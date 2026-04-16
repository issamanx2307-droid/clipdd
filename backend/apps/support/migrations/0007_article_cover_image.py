from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0006_article'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='cover_image',
            field=models.URLField(blank=True, max_length=500),
        ),
    ]
