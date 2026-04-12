from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_project_include_person'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='extra_requirements',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='productimage',
            name='image_type',
            field=models.CharField(
                choices=[('product', 'Product'), ('person', 'Person')],
                default='product',
                max_length=20,
            ),
        ),
    ]
