from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='template_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='project',
            name='duration',
            field=models.IntegerField(default=15),
        ),
    ]
