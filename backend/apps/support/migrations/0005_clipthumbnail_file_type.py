from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0004_clipthumbnail'),
    ]

    operations = [
        migrations.AddField(
            model_name='clipthumbnail',
            name='file_type',
            field=models.CharField(default='image', max_length=10),
        ),
    ]
