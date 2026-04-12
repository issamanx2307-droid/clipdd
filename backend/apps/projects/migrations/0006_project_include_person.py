from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0005_project_voice'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='include_person',
            field=models.BooleanField(default=True),
        ),
    ]
