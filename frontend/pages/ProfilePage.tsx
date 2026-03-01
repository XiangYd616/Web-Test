import { Loader2, Lock, Shield, Trash2, Upload, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useTestUser } from '../context/TestContext';
import i18n from '../i18n';
import { logout } from '../services/authApi';
// mfaApi 已移除（本地工具不需要多因素认证）
import {
  changePassword,
  deleteAccount,
  getProfile,
  updateProfile,
  uploadAvatar,
} from '../services/userApi';

const ProfilePage = () => {
  const { currentUser, setCurrentUser } = useTestUser();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    avatarUrl: '',
    timezone: '',
    language: '',
    loginCount: 0,
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Avatar Crop State
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropFileName, setCropFileName] = useState('avatar.jpg');
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropDisplaySize, setCropDisplaySize] = useState({ width: 0, height: 0 });
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const cropRectRef = useRef(cropRect);
  const cropDisplayRef = useRef(cropDisplaySize);
  const [cropAspectRatio, setCropAspectRatio] = useState(1);
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
    mode: 'move' | 'resize';
    corner?: 'tl' | 'tr' | 'bl' | 'br';
  } | null>(null);

  // Delete Account State
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const { width, height } = cropDisplayRef.current;
    if (!width || !height) return;

    const centerX = cropRectRef.current.x + cropRectRef.current.width / 2;
    const centerY = cropRectRef.current.y + cropRectRef.current.height / 2;
    const maxWidth = Math.min(width, height * cropAspectRatio);
    const nextWidth = Math.min(maxWidth, cropRectRef.current.width);
    const nextHeight = nextWidth / cropAspectRatio;
    const nextX = Math.max(0, Math.min(centerX - nextWidth / 2, width - nextWidth));
    const nextY = Math.max(0, Math.min(centerY - nextHeight / 2, height - nextHeight));
    setCropRect({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });
  }, [cropAspectRatio]);

  const readImageDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(t('profile.avatarReadFailed')));
      reader.readAsDataURL(file);
    });

  const loadImage = (dataUrl: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(t('profile.avatarLoadFailed')));
      img.src = dataUrl;
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readImageDataUrl(file);
      const image = await loadImage(dataUrl);
      setCropSource(dataUrl);
      setCropImage(image);
      setCropFileName(file.name);
      setCropModalOpen(true);
      // Reset input value to allow selecting same file again
      e.target.value = '';
    } catch (err) {
      toast.error((err as Error).message || t('profile.avatarReadFailed'));
    }
  };

  const initCropRect = (width: number, height: number, ratio = cropAspectRatio) => {
    const maxWidth = Math.min(width, height * ratio);
    const targetWidth = maxWidth * 0.7;
    const targetHeight = targetWidth / ratio;
    setCropRect({
      x: Math.max(0, (width - targetWidth) / 2),
      y: Math.max(0, (height - targetHeight) / 2),
      width: targetWidth,
      height: targetHeight,
    });
  };

  const handleCropImageLoad = () => {
    const element = cropImageRef.current;
    if (!element) return;

    const width = element.clientWidth;
    const height = element.clientHeight;
    setCropDisplaySize({ width, height });
    initCropRect(width, height);
  };

  const startCropDrag = (
    clientX: number,
    clientY: number,
    mode: 'move' | 'resize',
    corner?: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    cropDragRef.current = {
      startX: clientX,
      startY: clientY,
      originX: cropRectRef.current.x,
      originY: cropRectRef.current.y,
      originWidth: cropRectRef.current.width,
      originHeight: cropRectRef.current.height,
      mode,
      corner,
    };
  };

  const handleCropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    startCropDrag(event.clientX, event.clientY, 'move');
  };

  const handleCropResizeStart = (
    corner: 'tl' | 'tr' | 'bl' | 'br',
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    startCropDrag(event.clientX, event.clientY, 'resize', corner);
  };

  const handleCropMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cropDragRef.current) return;
    event.preventDefault();

    const { startX, startY, originX, originY, originWidth, originHeight, mode, corner } =
      cropDragRef.current;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const { width, height } = cropDisplayRef.current;
    const ratio = cropAspectRatio;

    if (mode === 'move') {
      let nextX = originX + dx;
      let nextY = originY + dy;
      nextX = Math.max(0, Math.min(nextX, width - originWidth));
      nextY = Math.max(0, Math.min(nextY, height - originHeight));
      setCropRect(prev => ({ ...prev, x: nextX, y: nextY }));
    } else if (mode === 'resize' && corner) {
      let nextWidth = originWidth;
      let nextHeight = originHeight;
      let nextX = originX;
      let nextY = originY;

      if (corner === 'br') {
        nextWidth = Math.max(50, originWidth + dx);
        nextHeight = nextWidth / ratio;
      } else if (corner === 'bl') {
        nextWidth = Math.max(50, originWidth - dx);
        nextHeight = nextWidth / ratio;
        nextX = originX + originWidth - nextWidth;
      } else if (corner === 'tr') {
        nextWidth = Math.max(50, originWidth + dx);
        nextHeight = nextWidth / ratio;
        nextY = originY + originHeight - nextHeight;
      } else if (corner === 'tl') {
        nextWidth = Math.max(50, originWidth - dx);
        nextHeight = nextWidth / ratio;
        nextX = originX + originWidth - nextWidth;
        nextY = originY + originHeight - nextHeight;
      }

      // Boundary checks
      if (nextX < 0) {
        nextX = 0;
        nextWidth = originX + originWidth;
        nextHeight = nextWidth / ratio;
        if (corner?.includes('t')) nextY = originY + originHeight - nextHeight;
      }
      if (nextY < 0) {
        nextY = 0;
        nextHeight = originY + originHeight;
        nextWidth = nextHeight * ratio;
        if (corner?.includes('l')) nextX = originX + originWidth - nextWidth;
      }
      if (nextX + nextWidth > width) {
        nextWidth = width - nextX;
        nextHeight = nextWidth / ratio;
        if (corner?.includes('t')) nextY = originY + originHeight - nextHeight;
      }
      if (nextY + nextHeight > height) {
        nextHeight = height - nextY;
        nextWidth = nextHeight * ratio;
        if (corner?.includes('l')) nextX = originX + originWidth - nextWidth;
      }

      setCropRect({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });
    }
  };

  const handleCropMouseUp = () => {
    cropDragRef.current = null;
  };

  const handleConfirmCrop = async () => {
    if (!cropImage) return;
    setSaving(true);
    try {
      const { width, height } = cropDisplayRef.current;
      const { x, y, width: rectWidth, height: rectHeight } = cropRectRef.current;
      const scaleX = cropImage.naturalWidth / width;
      const scaleY = cropImage.naturalHeight / height;
      const canvas = document.createElement('canvas');
      const targetSize = 256;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(t('profile.avatarProcessFailed'));

      ctx.drawImage(
        cropImage,
        x * scaleX,
        y * scaleY,
        rectWidth * scaleX,
        rectHeight * scaleY,
        0,
        0,
        targetSize,
        targetSize
      );

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      );
      if (!blob) throw new Error(t('profile.avatarCompressFailed'));

      setAvatarPreview(canvas.toDataURL('image/jpeg', 0.8));
      const processed = new File([blob], cropFileName.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });

      const data = await uploadAvatar(processed);
      setProfileForm(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
      await updateProfile({ avatarUrl: data.avatarUrl });
      toast.success(t('profile.avatarUpdated'));
      setCropModalOpen(false);
    } catch (err) {
      toast.error((err as Error).message || t('profile.avatarUploadFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error(t('profile.deletePasswordRequired'));
      return;
    }
    try {
      await deleteAccount(deletePassword);
      await logout().catch(() => undefined);
      window.localStorage.removeItem('accessToken');
      window.localStorage.removeItem('refreshToken');
      window.localStorage.removeItem('current_user');
      setCurrentUser(null);
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || t('profile.deleteFailed'));
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await getProfile();
        const profileData = data as Record<string, unknown>;
        setProfileForm({
          username: String(profileData.username || ''),
          email: String(profileData.email || ''),
          avatarUrl: String(profileData.avatarUrl || ''),
          timezone: String(profileData.timezone || ''),
          language: String(profileData.language || i18n.language || 'zh-CN'),
          loginCount: Number(profileData.loginCount || 0),
        });
        setAvatarPreview(String(profileData.avatarUrl || ''));
      } catch (err) {
        toast.error((err as Error).message || t('profile.loadFailed'));
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, [t]);

  useEffect(() => {
    cropRectRef.current = cropRect;
  }, [cropRect]);

  useEffect(() => {
    cropDisplayRef.current = cropDisplaySize;
  }, [cropDisplaySize]);

  useEffect(() => {
    if (!cropImage) return;
    const { width, height } = cropDisplayRef.current;
    if (!width || !height) return;
    const { x, y, width: rectWidth, height: rectHeight } = cropRectRef.current;
    const canvas = cropPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 128;
    canvas.width = previewSize;
    canvas.height = previewSize;
    const scaleX = cropImage.naturalWidth / width;
    const scaleY = cropImage.naturalHeight / height;

    ctx.clearRect(0, 0, previewSize, previewSize);
    ctx.drawImage(
      cropImage,
      x * scaleX,
      y * scaleY,
      rectWidth * scaleX,
      rectHeight * scaleY,
      0,
      0,
      previewSize,
      previewSize
    );
  }, [cropRect, cropImage]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        username: profileForm.username,
        email: profileForm.email,
        avatarUrl: profileForm.avatarUrl,
        timezone: profileForm.timezone,
        language: profileForm.language,
      };
      await updateProfile(payload);
      toast.success(t('profile.profileSaved'));
      if (currentUser) {
        const next = { ...currentUser, ...payload } as Record<string, unknown>;
        setCurrentUser(next);
        window.localStorage.setItem('current_user', JSON.stringify(next));
      }
    } catch (err) {
      toast.error((err as Error).message || t('profile.profileSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      toast.success(t('profile.passwordSaved'));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      toast.error((err as Error).message || t('profile.passwordSaveFailed'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const userSummary = useMemo(() => {
    const payload = currentUser || {};
    return {
      username: String(payload.username || payload.name || '-'),
      email: String(payload.email || '-'),
      role: String(payload.role || '-'),
      lastLogin: payload.lastLogin ? String(payload.lastLogin) : '-',
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-[50vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  return (
    <div
      role='application'
      className='container py-6 space-y-6 max-w-7xl mx-auto'
      onMouseMove={handleCropMouseMove}
      onMouseUp={handleCropMouseUp}
    >
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('profile.title')}</h2>
          <p className='text-sm text-muted-foreground mt-1'>{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        {/* Sidebar Summary */}
        <Card className='md:col-span-1 h-fit'>
          <CardHeader>
            <CardTitle>{t('profile.summaryTitle')}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='flex flex-col items-center text-center'>
              <Avatar className='h-24 w-24 mb-4'>
                <AvatarImage src={avatarPreview || profileForm.avatarUrl} />
                <AvatarFallback className='text-2xl'>
                  {userSummary.username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className='font-semibold text-lg'>{userSummary.username}</h3>
              <p className='text-sm text-muted-foreground'>{userSummary.email}</p>
            </div>
            <Separator />
            <div className='space-y-4 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{t('profile.role')}</span>
                <Badge variant='outline'>{userSummary.role}</Badge>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{t('profile.lastLogin')}</span>
                <span className='font-medium'>{userSummary.lastLogin}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className='md:col-span-3'>
          <Tabs defaultValue='profile' className='w-full'>
            <CardHeader className='border-b px-0 pb-0 mx-6 mb-6'>
              <TabsList className='w-full justify-start rounded-none border-b bg-transparent p-0'>
                <TabsTrigger
                  value='profile'
                  className='relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none'
                >
                  <User className='h-4 w-4 mr-2' />
                  {t('profile.tabProfile')}
                </TabsTrigger>
                <TabsTrigger
                  value='password'
                  className='relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none'
                >
                  <Lock className='h-4 w-4 mr-2' />
                  {t('profile.tabPassword')}
                </TabsTrigger>
                <TabsTrigger
                  value='security'
                  className='relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none'
                >
                  <Shield className='h-4 w-4 mr-2' />
                  {t('profile.tabSecurity')}
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value='profile' className='space-y-6 mt-0'>
                <form onSubmit={handleProfileSubmit} className='space-y-6'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='username'>{t('profile.username')}</Label>
                      <Input
                        id='username'
                        value={profileForm.username}
                        onChange={e =>
                          setProfileForm(prev => ({ ...prev, username: e.target.value }))
                        }
                        placeholder={t('profile.usernamePlaceholder')}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='email'>{t('profile.email')}</Label>
                      <Input
                        id='email'
                        type='email'
                        value={profileForm.email}
                        onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder='email@example.com'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='avatarUrl'>{t('profile.avatar')}</Label>
                      <div className='flex gap-2'>
                        <Input
                          id='avatarUrl'
                          value={profileForm.avatarUrl}
                          onChange={e =>
                            setProfileForm(prev => ({ ...prev, avatarUrl: e.target.value }))
                          }
                          placeholder='https://...'
                        />
                        <div className='relative'>
                          <Input
                            type='file'
                            className='absolute inset-0 opacity-0 cursor-pointer w-full'
                            accept='image/*'
                            onChange={handleFileSelect}
                          />
                          <Button type='button' variant='outline' size='icon'>
                            <Upload className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='timezone'>{t('profile.timezone')}</Label>
                      <Input
                        id='timezone'
                        value={profileForm.timezone}
                        onChange={e =>
                          setProfileForm(prev => ({ ...prev, timezone: e.target.value }))
                        }
                        placeholder={t('profile.timezonePlaceholder')}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='language'>{t('profile.language')}</Label>
                      <Input
                        id='language'
                        value={profileForm.language === 'en-US' ? 'English' : '中文'}
                        disabled
                        className='bg-muted'
                      />
                      <p className='text-xs text-muted-foreground'>
                        {t('profile.languageHint', '语言可在「偏好设置」中修改')}
                      </p>
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='loginCount'>{t('profile.loginCount')}</Label>
                      <Input
                        id='loginCount'
                        type='number'
                        value={profileForm.loginCount}
                        disabled
                        className='bg-muted'
                      />
                    </div>
                  </div>
                  <div className='flex justify-end'>
                    <Button type='submit' disabled={saving}>
                      {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                      {t('profile.saveProfile')}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value='password' className='space-y-6 mt-0'>
                <form onSubmit={handlePasswordSubmit} className='space-y-6 max-w-md'>
                  <div className='space-y-2'>
                    <Label htmlFor='currentPassword'>{t('profile.currentPassword')}</Label>
                    <Input
                      id='currentPassword'
                      type='password'
                      required
                      value={passwordForm.currentPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='newPassword'>{t('profile.newPassword')}</Label>
                    <Input
                      id='newPassword'
                      type='password'
                      required
                      value={passwordForm.newPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='confirmPassword'>{t('profile.confirmPassword')}</Label>
                    <Input
                      id='confirmPassword'
                      type='password'
                      required
                      value={passwordForm.confirmPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <Button type='submit' disabled={passwordSaving}>
                    {passwordSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    {t('profile.updatePassword')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value='security' className='space-y-8 mt-0'>
                {/* Delete Account Section */}
                <div className='pt-4'>
                  <h3 className='text-lg font-medium text-destructive mb-2'>
                    {t('profile.deleteSectionTitle')}
                  </h3>
                  <p className='text-sm text-muted-foreground mb-4'>{t('profile.deleteIntro')}</p>
                  <Button variant='destructive' onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className='mr-2 h-4 w-4' />
                    {t('profile.deleteAccountButton')}
                  </Button>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>{t('profile.cropTitle')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='flex items-center gap-4'>
              <Label>{t('profile.cropRatio')}</Label>
              <Select
                value={String(cropAspectRatio)}
                onValueChange={v => setCropAspectRatio(Number(v))}
              >
                <SelectTrigger className='w-[120px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>1:1</SelectItem>
                  <SelectItem value={String(4 / 3)}>4:3</SelectItem>
                  <SelectItem value={String(16 / 9)}>16:9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              role='presentation'
              className='relative border bg-black/5 overflow-hidden select-none touch-none h-[400px] w-full flex items-center justify-center'
              onMouseDown={e => e.preventDefault()}
            >
              <img
                ref={cropImageRef}
                src={cropSource}
                alt='Crop source'
                onLoad={handleCropImageLoad}
                className='max-w-full max-h-full object-contain pointer-events-none'
                draggable={false}
              />

              {cropRect.width > 0 && (
                <div
                  role='button'
                  tabIndex={0}
                  className='absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move'
                  style={{
                    width: cropRect.width,
                    height: cropRect.height,
                    left: cropRect.x,
                    top: cropRect.y,
                  }}
                  onMouseDown={handleCropMouseDown}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                    }
                  }}
                >
                  {/* Resize Handles */}
                  <button
                    className='absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary cursor-nw-resize'
                    onMouseDown={e => handleCropResizeStart('tl', e)}
                  />
                  <button
                    className='absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary cursor-ne-resize'
                    onMouseDown={e => handleCropResizeStart('tr', e)}
                  />
                  <button
                    className='absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary cursor-sw-resize'
                    onMouseDown={e => handleCropResizeStart('bl', e)}
                  />
                  <button
                    className='absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary cursor-se-resize'
                    onMouseDown={e => handleCropResizeStart('br', e)}
                  />
                </div>
              )}
            </div>

            <div className='flex justify-center'>
              <div className='text-center'>
                <canvas
                  ref={cropPreviewRef}
                  className='border rounded-full w-32 h-32 mx-auto bg-muted'
                />
                <p className='text-xs text-muted-foreground mt-2'>{t('profile.cropPreviewTip')}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCropModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmCrop} disabled={saving}>
              {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t('profile.cropUse')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile.deleteIntro')}
              <ul className='list-disc list-inside mt-2 space-y-1'>
                <li>{t('profile.deleteImpactAccount')}</li>
                <li>{t('profile.deleteImpactHistory')}</li>
                <li>{t('profile.deleteImpactWorkspace')}</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='deletePassword'>{t('profile.deletePasswordRequired')}</Label>
              <Input
                id='deletePassword'
                type='password'
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder={t('profile.deletePasswordPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant='destructive' onClick={handleDeleteAccount}>
              {t('profile.deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ProfilePage };
export default ProfilePage;
