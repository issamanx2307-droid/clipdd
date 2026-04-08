from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0003_project_duration_template_url'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('generating_images', 'Generating Images'),
                    ('awaiting_selection', 'Awaiting Selection'),
                    ('generating_video', 'Generating Video'),
                    ('done', 'Done'),
                    ('failed', 'Failed'),
                ],
                default='draft',
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='uploads/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='uploaded_images', to='projects.project')),
            ],
        ),
        migrations.CreateModel(
            name='GeneratedImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image_url', models.URLField(max_length=1000)),
                ('fal_request_id', models.CharField(blank=True, max_length=255)),
                ('generation_round', models.IntegerField(default=1)),
                ('is_selected', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='generated_images', to='projects.project')),
            ],
        ),
    ]
