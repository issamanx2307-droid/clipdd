import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CreditOrder',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('package', models.CharField(
                    choices=[('1', '1 เครดิต — 89 บาท'), ('5', '5 เครดิต — 399 บาท')],
                    max_length=5,
                )),
                ('credits', models.IntegerField()),
                ('amount', models.IntegerField()),
                ('slip_image', models.ImageField(blank=True, null=True, upload_to='slips/')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'รอตรวจสลิป'),
                        ('approved', 'อนุมัติแล้ว'),
                        ('rejected', 'ปฏิเสธ'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('admin_note', models.CharField(blank=True, max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='credit_orders',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
