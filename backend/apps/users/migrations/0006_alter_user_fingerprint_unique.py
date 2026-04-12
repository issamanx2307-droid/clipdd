from django.db import migrations, models


def normalize_fingerprints_before_unique(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(fingerprint='').update(fingerprint=None)
    seen = set()
    for row in User.objects.exclude(fingerprint__isnull=True).order_by('id').iterator():
        fp = row.fingerprint
        if fp in seen:
            User.objects.filter(pk=row.pk).update(fingerprint=None)
        else:
            seen.add(fp)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_alter_user_fingerprint_null'),
    ]

    operations = [
        migrations.RunPython(normalize_fingerprints_before_unique, noop_reverse),
        migrations.AlterField(
            model_name='user',
            name='fingerprint',
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True, unique=True),
        ),
    ]
