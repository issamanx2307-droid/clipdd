from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0004_project_status_productimage_generatedimage'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='voice',
            field=models.CharField(default='nova', max_length=20),
        ),
    ]
