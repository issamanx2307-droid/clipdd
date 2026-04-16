"""
Article views — public listing/detail and admin CRUD.
"""
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .models import Article
from .views_shared import check_admin


def _serialize_article_list(a):
    return {
        'id': a.id, 'slug': a.slug, 'title': a.title, 'excerpt': a.excerpt,
        'category': a.category, 'cat_color': a.cat_color,
        'cover_bg': a.cover_bg, 'cover_image': a.cover_image,
        'read_time': a.read_time,
        'published_at': a.published_at.isoformat() if a.published_at else None,
    }


class PublicArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        articles = Article.objects.filter(is_published=True)
        return Response([_serialize_article_list(a) for a in articles])


class PublicArticleDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            a = Article.objects.get(slug=slug, is_published=True)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        return Response({
            'id': a.id, 'slug': a.slug, 'title': a.title,
            'excerpt': a.excerpt, 'content': a.content,
            'category': a.category, 'cat_color': a.cat_color,
            'cover_bg': a.cover_bg, 'cover_image': a.cover_image,
            'read_time': a.read_time,
            'meta_title': a.meta_title or a.title,
            'meta_description': a.meta_description or a.excerpt,
            'published_at': a.published_at.isoformat() if a.published_at else None,
        })


class AdminArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        articles = Article.objects.all()
        return Response([{
            'id': a.id, 'slug': a.slug, 'title': a.title,
            'category': a.category, 'cat_color': a.cat_color,
            'cover_image': a.cover_image, 'read_time': a.read_time,
            'is_published': a.is_published,
            'published_at': a.published_at.isoformat() if a.published_at else None,
            'created_at': a.created_at.isoformat(),
        } for a in articles])

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        d = request.data
        slug = d.get('slug', '').strip()
        if not slug:
            return Response({'detail': 'slug จำเป็นต้องใส่'}, status=400)
        if Article.objects.filter(slug=slug).exists():
            return Response({'detail': f'slug "{slug}" มีอยู่แล้ว'}, status=400)
        is_pub = bool(d.get('is_published', False))
        a = Article.objects.create(
            title=d.get('title', '').strip(), slug=slug,
            excerpt=d.get('excerpt', '').strip(),
            content=d.get('content', '').strip(),
            category=d.get('category', '').strip(),
            cat_color=d.get('cat_color', '#FF7A00').strip(),
            cover_bg=d.get('cover_bg', 'linear-gradient(135deg,#FFF7ED,#FED7AA)').strip(),
            cover_image=d.get('cover_image', '').strip(),
            read_time=d.get('read_time', '5 นาที').strip(),
            meta_title=d.get('meta_title', '').strip(),
            meta_description=d.get('meta_description', '').strip(),
            is_published=is_pub,
            published_at=timezone.now() if is_pub else None,
        )
        return Response({'detail': 'สร้างบทความสำเร็จ', 'id': a.id}, status=201)


class AdminArticleDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            a = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        return Response({
            'id': a.id, 'slug': a.slug, 'title': a.title,
            'excerpt': a.excerpt, 'content': a.content,
            'category': a.category, 'cat_color': a.cat_color,
            'cover_bg': a.cover_bg, 'cover_image': a.cover_image,
            'read_time': a.read_time,
            'meta_title': a.meta_title, 'meta_description': a.meta_description,
            'is_published': a.is_published,
            'published_at': a.published_at.isoformat() if a.published_at else None,
        })

    def put(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            a = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        d = request.data
        new_slug = d.get('slug', a.slug).strip()
        if new_slug != a.slug and Article.objects.filter(slug=new_slug).exists():
            return Response({'detail': f'slug "{new_slug}" มีอยู่แล้ว'}, status=400)
        was_pub = a.is_published
        is_pub = bool(d.get('is_published', was_pub))
        a.title            = d.get('title', a.title).strip()
        a.slug             = new_slug
        a.excerpt          = d.get('excerpt', a.excerpt).strip()
        a.content          = d.get('content', a.content).strip()
        a.category         = d.get('category', a.category).strip()
        a.cat_color        = d.get('cat_color', a.cat_color).strip()
        a.cover_bg         = d.get('cover_bg', a.cover_bg).strip()
        a.cover_image      = d.get('cover_image', a.cover_image).strip()
        a.read_time        = d.get('read_time', a.read_time).strip()
        a.meta_title       = d.get('meta_title', a.meta_title).strip()
        a.meta_description = d.get('meta_description', a.meta_description).strip()
        a.is_published     = is_pub
        if is_pub and not was_pub:
            a.published_at = timezone.now()
        elif not is_pub:
            a.published_at = None
        a.save()
        return Response({'detail': 'อัปเดตบทความสำเร็จ'})

    def delete(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            a = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        a.delete()
        return Response({'detail': 'ลบบทความสำเร็จ'})
