from django.db import models
from apps.users.models import User


class Project(models.Model):
    STATUS = [('draft','Draft'),('generating_script','Generating Script'),('awaiting_script_approval','Awaiting Script Approval'),('generating_video','Generating Video'),('done','Done'),('failed','Failed')]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    product_name = models.CharField(max_length=255)
    key_points = models.TextField(blank=True)
    tone = models.CharField(max_length=50, default='urgency')
    voice = models.CharField(max_length=20, default='nova')  # nova/shimmer/onyx/echo
    template_url = models.URLField(blank=True)
    duration = models.IntegerField(default=15)
    include_person = models.BooleanField(default=True)
    extra_requirements = models.TextField(blank=True)   # True = Flux generates human using product
    status = models.CharField(max_length=30, choices=STATUS, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name} ({self.status})"


class ProductImage(models.Model):
    """Images uploaded by user as reference."""
    IMAGE_TYPES = [('product', 'Product'), ('person', 'Person')]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='uploaded_images')
    image = models.ImageField(upload_to='uploads/')
    image_type = models.CharField(max_length=20, choices=IMAGE_TYPES, default='product')
    uploaded_at = models.DateTimeField(auto_now_add=True)


class GeneratedImage(models.Model):
    """AI-generated images for user to choose from."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='generated_images')
    image_url = models.URLField(max_length=1000)
    fal_request_id = models.CharField(max_length=255, blank=True)
    generation_round = models.IntegerField(default=1)  # 1, 2, or 3
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
