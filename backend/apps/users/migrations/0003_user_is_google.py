from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_fingerprint_credits'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_google',
            field=models.BooleanField(default=False),
        ),
    ]
