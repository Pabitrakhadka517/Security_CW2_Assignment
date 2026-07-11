import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, CheckCircle2, Loader2, Upload, User, Phone, Mail, MapPin } from 'lucide-react'
import { profileEndpoints } from '@/components/api/userapi'

// ── Nepal Districts (same data as Checkout) ─────────────────────────────────
const NEPAL_DISTRICTS = {
  'Taplejung': ['Phungling','Meringden','Sidingba','Phaktanglung','Aathrai Tribeni','Mikwakhola','Sirijangha','Pathivara Yangwarak'],
  'Sankhuwasabha': ['Khandbari','Chainpur','Dharmadevi','Madi','Panchkhapan','Makalu','Silichong','Bhotkhola','Sabhapokhari','Chichila'],
  'Solukhumbu': ['Salleri','Solududhkunda','Dudhakaushika','Nechasalyan','Mapya Dudhkoshi','Thulung Dudhkoshi','Mahakulung','Likhupike','Khumbu Pasanglhamu'],
  'Okhaldhunga': ['Siddhicharan','Champadevi','Sunkoshi','Likhu','Chisankhugadhi','Molung','Khijidemba','Manebhanjyang'],
  'Khotang': ['Diktel','Halesi Tuwachung','Khotehang','Diprung Chuichumma','Aiselukharka','Jantedhunga','Kepilasgadhi','Sakela','Barahpokhari','Rawabesi'],
  'Bhojpur': ['Bhojpur','Shadananda','Tyamkemaiyum','Arun','Pauwadungma','Salpasilichho','Aamchowk','Hatuwagadhi','Ramprasad Rai'],
  'Dhankuta': ['Dhankuta','Pakhribas','Mahalaxmi','Sangurigadhi','Chhathar Jorpati','Shahidbhumi','Chaubise'],
  'Terhathum': ['Myanglung','Laligurans','Aathrai','Chhathar','Phedap','Menchhayayem'],
  'Panchthar': ['Phidim','Hilihang','Kummayak','Miklajung','Phalgunanda','Phalelung','Yangwarak','Tumbewa'],
  'Ilam': ['Ilam','Deumai','Mai','Suryodaya','Phakphokthum','Maijogmai','Chulachuli','Rong','Mangsebung','Sandakpur'],
  'Jhapa': ['Mechinagar','Damak','Bhadrapur','Birtamod','Arjundhara','Kankai','Shivasatakshi','Gauradaha','Kamal','Buddhashanti','Haldibari','Barhadashi','Jhapa','Kachankawal','Gaurigunj'],
  'Morang': ['Biratnagar','Sunwarshi','Belbari','Pathari Shanishchare','Urlabari','Rangeli','Letang','Ratuwamai','Sundarharaicha','Kerabari','Budhiganga','Kanepokhari','Gramthan','Katahari','Dhanpalthan','Jahada'],
  'Sunsari': ['Itahari','Dharan','Inaruwa','Duhabi','Ramdhuni','Barahakshetra','Koshi','Gadhi','Barju','Bhokraha Narsingh','Harinagara','Dewanganj'],
  'Udayapur': ['Gaighat','Triyuga','Katari','Chaudandigadhi','Belaka','Udayapurgadhi','Rautamai','Limchungbung'],
  'Saptari': ['Rajbiraj','Kanchanrup','Dakneshwori','Saptakoshi','Surunga','Shambhunath','Balan Bihul','Bishnupur','Khadak'],
  'Siraha': ['Siraha','Lahan','Golbazar','Mirchaiya','Dhangadhimai','Kalyanpur','Karjanha','Sukhipur','Bhagwanpur'],
  'Dhanusha': ['Janakpur','Chhireshwornath','Ganeshman Charnath','Dhanushadham','Nagarain','Bideha','Mithila','Sabaila','Kamala'],
  'Mahottari': ['Jaleshwar','Bardibas','Gaushala','Loharpatti','Ramgopalpur','Aurahi','Balwa','Bhangaha'],
  'Sarlahi': ['Malangwa','Barahathwa','Haripur','Ishworpur','Lalbandi','Godaita','Bagmati','Balara'],
  'Rautahat': ['Gaur','Chandrapur','Garuda','Gujara','Baudhimai','Brindaban','Dewahi Gonahi'],
  'Bara': ['Kalaiya','Jitpur Simara','Kolhabi','Nijgadh','Mahagadhimai','Simraungadh','Pachrauta'],
  'Parsa': ['Birgunj','Pokhariya','Bahudarmai','Parsagadhi','Bindabasini','Chhipaharmai'],
  'Dolakha': ['Charikot','Bhimeshwor','Jiri','Melung','Bigu','Gaurishankar','Kalinchok','Tamakoshi'],
  'Sindhupalchok': ['Chautara','Melamchi','Bahrabise','Indrawati','Jugal','Helambu','Bhotekoshi'],
  'Rasuwa': ['Dhunche','Gosaikunda','Kalika','Naukunda','Uttargaya'],
  'Dhading': ['Dhading Besi','Nilkantha','Dhunibesi','Galchi','Benighat Rorang','Gajuri'],
  'Nuwakot': ['Bidur','Belkotgadhi','Kakani','Tadi','Dupcheshwar','Kispang'],
  'Kathmandu': ['Kathmandu','Kirtipur','Madhyapur Thimi','Budhanilkantha','Chandragiri','Dakshinkali','Gokarneshwor','Nagarjun','Shankarapur','Tarakeshwor','Tokha'],
  'Bhaktapur': ['Bhaktapur','Madhyapur Thimi','Suryabinayak','Changunarayan'],
  'Lalitpur': ['Lalitpur','Godavari','Mahalaxmi','Konjyosom','Bagmati'],
  'Kavrepalanchok': ['Dhulikhel','Banepa','Panauti','Panchkhal','Namobuddha','Mandandeupur'],
  'Ramechhap': ['Manthali','Ramechhap','Doramba','Gokulganga'],
  'Sindhuli': ['Sindhuli','Kamalamai','Dudhauli','Sunkoshi'],
  'Makwanpur': ['Hetauda','Thaha','Bhimphedi','Makawanpurgadhi'],
  'Chitwan': ['Bharatpur','Ratnanagar','Khairahani','Madi','Rapti','Kalika'],
  'Gorkha': ['Gorkha','Palungtar','Sulikot','Siranchok','Barpak Sulikot'],
  'Kaski': ['Pokhara','Annapurna','Machhapuchchhre','Madi','Rupa'],
  'Lamjung': ['Besisahar','Sundarbazar','Rainas','Madhya Nepal'],
  'Tanahu': ['Damauli','Byas','Shuklagandaki','Bhanu','Bhimad'],
  'Nawalpur': ['Kawasoti','Gaindakot','Devchuli','Madhyabindu'],
  'Syangja': ['Putalibazar','Galyang','Chapakot','Waling','Bhirkot'],
  'Parbat': ['Kusma','Phalebas','Jaljala'],
  'Baglung': ['Baglung','Dhorpatan','Galkot','Jaimini'],
  'Rupandehi': ['Butwal','Siddharthanagar','Devdaha','Lumbini Sanskritik','Sainamaina','Tilottama'],
  'Kapilvastu': ['Kapilvastu','Banganga','Buddhabhumi','Shivaraj'],
  'Dang': ['Ghorahi','Tulsipur','Lamahi','Bangalachuli'],
  'Banke': ['Nepalgunj','Kohalpur','Narainapur','Rapti Sonari'],
  'Bardiya': ['Gulariya','Rajapur','Madhuwan','Thakurbaba'],
  'Nawalparasi West': ['Ramgram','Sunwal','Bardaghat'],
  'Surkhet': ['Birendranagar','Bheriganga','Gurbhakot','Panchapuri','Lekbeshi'],
  'Kailali': ['Dhangadi','Tikapur','Ghodaghodi','Lamkichuha','Bhajani'],
  'Kanchanpur': ['Bhimdatta','Mahakali','Shuklaphanta','Bedkot','Belauri'],
  'Dadeldhura': ['Amargadhi','Parshuram','Aalitaal'],
  'Baitadi': ['Dasharathchand','Patan','Melauli'],
  'Darchula': ['Mahakali','Shailyashikhar','Malikarjun'],
  'Bajura': ['Martadi','Badimalika','Triveni'],
  'Bajhang': ['Chainpur','Bungal','Jayaprithvi'],
  'Achham': ['Mangalsen','Sanphebagar','Kamalbazar'],
  'Doti': ['Dipayal Silgadhi','Shikhar','Purbichauki'],
  'Rolpa': ['Liwang','Runtigadhi','Tribeni'],
  'Pyuthan': ['Pyuthan','Swargadwari'],
  'Gulmi': ['Tamghas','Musikot','Resunga'],
  'Arghakhanchi': ['Sandhikharka','Sitganga'],
  'Palpa': ['Tansen','Rampur'],
  'Dolpa': ['Dunai','Thuli Bheri'],
  'Mugu': ['Gamgadhi','Chhayanath Rara'],
  'Humla': ['Simikot','Namkha'],
  'Jumla': ['Khalanga','Chandannath'],
  'Kalikot': ['Manma','Raskot'],
  'Dailekh': ['Narayan','Dullu'],
  'Jajarkot': ['Khalanga','Bheri'],
  'Rukum West': ['Musikot','Chaurjahari'],
  'Rukum East': ['Rukumkot','Bhume'],
  'Salyan': ['Salyan','Bagchaur'],
  'Manang': ['Chame','Narphu'],
  'Mustang': ['Jomsom','Gharapjhong'],
  'Myagdi': ['Beni','Annapurna'],
}

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm text-slate-900 outline-none transition focus:border-[#1A3C8A] focus:bg-white focus:ring-4 focus:ring-[#1A3C8A]/10'
const selectCls = inputCls + ' cursor-pointer'
const labelCls = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400'

export default function ProfileSetup() {
  const [loading, setLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    addressLine: '', district: '', city: '', postalCode: '',
  })
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await profileEndpoints.me()
        const user = res.data?.data || res.data
        if (user) {
          setForm({
            name:        user.name || '',
            phone:       user.phone || '',
            email:       user.email || '',
            addressLine: user.address?.addressLine || '',
            district:    user.address?.district || user.address?.state || '',
            city:        user.address?.city || '',
            postalCode:  user.address?.postalCode || '',
          })
          setAvatarUrl(user.avatarUrl || '')
          setAvatarPreview(user.avatarUrl || '')
        }
      } catch { /* ignore */ }
    }
    fetchProfile()
  }, [])

  const handle = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      await profileEndpoints.update({
        name:  form.name,
        email: form.email,
        phone: form.phone,
        address: {
          addressLine: form.addressLine,
          district:    form.district,
          city:        form.city,
          postalCode:  form.postalCode,
          country:     'Nepal',
        },
        avatarUrl,
      })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (file) => {
    if (!file) return
    setUploadError('')
    setAvatarUploading(true)
    setAvatarPreview(URL.createObjectURL(file))
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await profileEndpoints.uploadAvatar(fd)
      const uploaded = res.data?.data?.avatarUrl || res.data?.avatarUrl
      if (uploaded) {
        setAvatarUrl(uploaded)
        setAvatarPreview(uploaded)
        toast.success('Avatar uploaded')
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Avatar upload failed')
      toast.error(err.response?.data?.message || 'Avatar upload failed')
    } finally {
      setAvatarUploading(false)
    }
  }

  const initials = useMemo(() => {
    const parts = form.name.trim().split(' ').filter(Boolean)
    return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')
  }, [form.name])

  const cities = form.district ? (NEPAL_DISTRICTS[form.district] || []) : []

  return (
    <div className="space-y-6">

      {/* ── Personal Information ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(26,60,138,0.07),_rgba(255,107,53,0.07))] px-4 py-4 sm:py-5">
          <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
          <p className="mt-0.5 text-xs text-slate-500">Your name, contact details, and profile photo.</p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
          {/* Avatar */}
          <div className="flex flex-col items-center border-b border-slate-100 p-6 text-center lg:border-b-0 lg:border-r">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,_#1A3C8A,_#FF6B35)] text-2xl font-semibold text-white shadow-lg">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  : initials || 'U'}
              </div>
              <label className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-lg transition hover:scale-105">
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={e => uploadAvatar(e.target.files?.[0])} />
              </label>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">Profile photo</p>
            <p className="mt-0.5 text-xs text-slate-400">JPG, PNG or WebP</p>
            {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
            {avatarUrl && !uploadError && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
              </p>
            )}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <label className={labelCls}><span className="flex items-center gap-1"><User className="h-3 w-3" /> Full Name</span></label>
              <input value={form.name} onChange={e => handle('name', e.target.value)} placeholder="Jane Doe" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span></label>
              <input value={form.phone} onChange={e => handle('phone', e.target.value)} placeholder="+977 98XXXXXXXX" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}><span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span></label>
              <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} placeholder="you@example.com" className={inputCls} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Shipping Address ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(26,60,138,0.07),_rgba(255,107,53,0.07))] px-4 py-4 sm:py-5">
          <h2 className="text-lg font-semibold text-slate-900">Shipping Address</h2>
          <p className="mt-0.5 text-xs text-slate-500">Autofilled at checkout. Must be within Nepal.</p>
        </div>

        <div className="p-4 sm:p-8 space-y-4">
          {/* Street address */}
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Street / House No / Tole</span></label>
            <textarea
              value={form.addressLine}
              onChange={e => handle('addressLine', e.target.value)}
              placeholder="House no., Tole, Ward no., locality…"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* District */}
            <div>
              <label className={labelCls}>District</label>
              <select
                value={form.district}
                onChange={e => { handle('district', e.target.value); handle('city', '') }}
                className={selectCls}
              >
                <option value="">Select District</option>
                {Object.keys(NEPAL_DISTRICTS).sort().map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* City / Municipality */}
            <div>
              <label className={labelCls}>City / Municipality</label>
              <select
                value={form.city}
                onChange={e => handle('city', e.target.value)}
                disabled={!form.district}
                className={selectCls + (!form.district ? ' opacity-50 cursor-not-allowed' : '')}
              >
                <option value="">{form.district ? 'Select City' : 'Select district first'}</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Postal code */}
            <div>
              <label className={labelCls}>Postal Code</label>
              <input
                value={form.postalCode}
                onChange={e => handle('postalCode', e.target.value)}
                placeholder="44600"
                className={inputCls}
              />
            </div>

            {/* Country (fixed) */}
            <div>
              <label className={labelCls}>Country</label>
              <input value="Nepal" readOnly className={inputCls + ' cursor-not-allowed opacity-60'} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-2">
        <button
          onClick={submit}
          disabled={loading || avatarUploading}
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,_#1A3C8A_0%,_#2550b7_55%,_#FF6B35_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(26,60,138,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

    </div>
  )
}
