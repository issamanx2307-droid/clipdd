from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('video_engine', '0001_initial'),
    ]

    operations = [
        # Add new status choices (update field)
        migrations.AlterField(
            model_name='renderjob',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending',        'Pending'),
                    ('processing',     'Processing'),
                    ('awaiting_kling', 'Awaiting Kling'),
                    ('assembling',     'Assembling'),
                    ('done',           'Done'),
                    ('failed',         'Failed'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        # Add kling_request_id
        migrations.AddField(
            model_name='renderjob',
            name='kling_request_id',
            field=models.CharField(blank=True, max_length=200),
        ),
        # Add script_data (GPT output stored for Phase 2)
        migrations.AddField(
            model_name='renderjob',
            name='script_data',
            field=models.JSONField(blank=True, null=True),
        ),
        # Add audio_duration (ffprobe result in seconds)
        migrations.AddField(
            model_name='renderjob',
            name='audio_duration',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
