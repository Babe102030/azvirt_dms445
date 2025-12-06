import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignatureCanvas } from './SignatureCanvas';
import { Camera, MapPin, Upload, Wifi, WifiOff, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileQCFormProps {
  deliveryId?: number;
  projectId?: number;
  onSuccess?: () => void;
}

export function MobileQCForm({ deliveryId, projectId, onSuccess }: MobileQCFormProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [photos, setPhotos] = useState<string[]>([]);
  const [inspectorSig, setInspectorSig] = useState<string>('');
  const [supervisorSig, setSupervisorSig] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    testName: '',
    testType: 'slump' as 'slump' | 'strength' | 'air_content' | 'temperature' | 'other',
    result: '',
    unit: '',
    status: 'pending' as 'pass' | 'fail' | 'pending',
    testedBy: '',
    notes: '',
    complianceStandard: 'EN 206',
  });

  const createTest = trpc.qualityTests.create.useMutation();
  const uploadPhoto = trpc.qualityTests.uploadPhoto.useMutation();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          console.error('GPS error:', error);
        }
      );
    }
  }, []);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPhotos([...photos, base64]);

      if (isOnline) {
        try {
          const photoData = base64.split(',')[1];
          const result = await uploadPhoto.mutateAsync({
            photoData,
            mimeType: file.type,
          });
          toast.success('Fotografija sačuvana / Photo saved');
        } catch (error) {
          toast.error('Greška pri čuvanju fotografije / Error saving photo');
        }
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      // Save to localStorage if offline
      if (!isOnline) {
        const offlineTests = JSON.parse(localStorage.getItem('offlineQCTests') || '[]');
        offlineTests.push({
          ...formData,
          deliveryId,
          projectId,
          photoUrls: JSON.stringify(photos),
          inspectorSignature: inspectorSig,
          supervisorSignature: supervisorSig,
          testLocation: location,
          timestamp: Date.now(),
        });
        localStorage.setItem('offlineQCTests', JSON.stringify(offlineTests));
        toast.success('Test sačuvan offline / Test saved offline');
        onSuccess?.();
        return;
      }

      // Upload photos first
      const uploadedPhotoUrls: string[] = [];
      for (const photo of photos) {
        try {
          const photoData = photo.split(',')[1];
          const result = await uploadPhoto.mutateAsync({
            photoData,
            mimeType: 'image/jpeg',
          });
          if (result.url) {
            uploadedPhotoUrls.push(result.url);
          }
        } catch (error) {
          console.error('Photo upload error:', error);
        }
      }

      // Create test
      await createTest.mutateAsync({
        ...formData,
        deliveryId,
        projectId,
        photoUrls: JSON.stringify(uploadedPhotoUrls),
        inspectorSignature: inspectorSig,
        supervisorSignature: supervisorSig,
        testLocation: location,
        offlineSyncStatus: 'synced',
      });

      toast.success('Test kvaliteta sačuvan / Quality test saved');
      onSuccess?.();
    } catch (error) {
      toast.error('Greška pri čuvanju testa / Error saving test');
    }
  };

  const renderStep1 = () => (
    <Card className="border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Korak 1: Osnovni podaci / Step 1: Basic Info</span>
          {!isOnline && <WifiOff className="w-5 h-5 text-orange-500" />}
          {isOnline && <Wifi className="w-5 h-5 text-green-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="testName">Naziv testa / Test Name *</Label>
          <Input
            id="testName"
            value={formData.testName}
            onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
            placeholder="npr. Slump test betona / e.g. Concrete slump test"
            className="text-lg h-12"
          />
        </div>

        <div>
          <Label htmlFor="testType">Tip testa / Test Type *</Label>
          <Select
            value={formData.testType}
            onValueChange={(value: any) => setFormData({ ...formData, testType: value })}
          >
            <SelectTrigger className="text-lg h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slump">Slump</SelectItem>
              <SelectItem value="strength">Čvrstoća / Strength</SelectItem>
              <SelectItem value="air_content">Sadržaj vazduha / Air Content</SelectItem>
              <SelectItem value="temperature">Temperatura / Temperature</SelectItem>
              <SelectItem value="other">Ostalo / Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="testedBy">Testirao / Tested By *</Label>
          <Input
            id="testedBy"
            value={formData.testedBy}
            onChange={(e) => setFormData({ ...formData, testedBy: e.target.value })}
            placeholder="Ime i prezime / Full name"
            className="text-lg h-12"
          />
        </div>

        <div>
          <Label htmlFor="complianceStandard">Standard / Compliance Standard</Label>
          <Select
            value={formData.complianceStandard}
            onValueChange={(value) => setFormData({ ...formData, complianceStandard: value })}
          >
            <SelectTrigger className="text-lg h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EN 206">EN 206</SelectItem>
              <SelectItem value="ASTM C94">ASTM C94</SelectItem>
              <SelectItem value="BS 8500">BS 8500</SelectItem>
              <SelectItem value="ACI 318">ACI 318</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setStep(2)}
          disabled={!formData.testName || !formData.testedBy}
          className="w-full h-12 text-lg bg-orange-500 hover:bg-orange-600"
        >
          Sledeći korak / Next Step →
        </Button>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="border-orange-500/20">
      <CardHeader>
        <CardTitle>Korak 2: Rezultati / Step 2: Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="result">Rezultat / Result *</Label>
          <Input
            id="result"
            value={formData.result}
            onChange={(e) => setFormData({ ...formData, result: e.target.value })}
            placeholder="npr. 75mm, 30MPa"
            className="text-lg h-12"
          />
        </div>

        <div>
          <Label htmlFor="unit">Jedinica / Unit</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="mm, MPa, °C"
            className="text-lg h-12"
          />
        </div>

        <div>
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger className="text-lg h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Prošao / Pass ✓</SelectItem>
              <SelectItem value="fail">Pao / Fail ✗</SelectItem>
              <SelectItem value="pending">Na čekanju / Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="notes">Napomene / Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Dodatne napomene... / Additional notes..."
            rows={4}
            className="text-lg"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            className="flex-1 h-12 text-lg"
          >
            ← Nazad / Back
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={!formData.result}
            className="flex-1 h-12 text-lg bg-orange-500 hover:bg-orange-600"
          >
            Sledeći korak / Next →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="border-orange-500/20">
      <CardHeader>
        <CardTitle>Korak 3: Dokumentacija / Step 3: Documentation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Fotografije / Photos ({photos.length})</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-12 text-lg mt-2"
          >
            <Camera className="w-5 h-5 mr-2" />
            Dodaj fotografiju / Add Photo
          </Button>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {photos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
              ))}
            </div>
          )}
        </div>

        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            GPS: {location}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep(2)}
            className="flex-1 h-12 text-lg"
          >
            ← Nazad / Back
          </Button>
          <Button
            onClick={() => setStep(4)}
            className="flex-1 h-12 text-lg bg-orange-500 hover:bg-orange-600"
          >
            Potpisi / Signatures →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card className="border-orange-500/20">
      <CardHeader>
        <CardTitle>Korak 4: Potpisi / Step 4: Signatures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Potpis inspektora / Inspector Signature *</Label>
          <SignatureCanvas
            onSave={(sig) => setInspectorSig(sig)}
            width={window.innerWidth > 500 ? 400 : window.innerWidth - 80}
            height={150}
          />
        </div>

        <div>
          <Label>Potpis supervizora / Supervisor Signature</Label>
          <SignatureCanvas
            onSave={(sig) => setSupervisorSig(sig)}
            width={window.innerWidth > 500 ? 400 : window.innerWidth - 80}
            height={150}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep(3)}
            className="flex-1 h-12 text-lg"
          >
            ← Nazad / Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!inspectorSig || createTest.isPending}
            className="flex-1 h-12 text-lg bg-orange-500 hover:bg-orange-600"
          >
            {createTest.isPending ? (
              'Čuvanje... / Saving...'
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Sačuvaj test / Save Test
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Progress indicator */}
      <div className="flex justify-between mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 mx-1 rounded ${
              s <= step ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}
