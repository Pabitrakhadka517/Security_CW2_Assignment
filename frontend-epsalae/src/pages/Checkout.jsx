// src/pages/Checkout.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Lock, AlertCircle, Loader2, Truck, Tag, X, Info, MapPin, CreditCard, ShoppingBag, ShieldCheck, ArrowRight, Banknote } from 'lucide-react'
import { useCart } from '@/store/cartstore'
import { orderApi } from '../components/api/orderapi'
import { getImageUrl } from '@/config'
import { useAuthStore } from '@/components/store/authstore'
import userApi from '../components/api/userapi'

// ── Nepal Districts ─────────────────────────────────────────────────────────
const NEPAL_DISTRICTS = {
  'Taplejung': ['Phungling', 'Meringden', 'Sidingba', 'Phaktanglung', 'Aathrai Tribeni', 'Mikwakhola', 'Sirijangha', 'Pathivara Yangwarak'],
  'Sankhuwasabha': ['Khandbari', 'Chainpur', 'Dharmadevi', 'Madi', 'Panchkhapan', 'Makalu', 'Silichong', 'Bhotkhola', 'Sabhapokhari', 'Chichila'],
  'Solukhumbu': ['Salleri', 'Solududhkunda', 'Dudhakaushika', 'Nechasalyan', 'Mapya Dudhkoshi', 'Thulung Dudhkoshi', 'Mahakulung', 'Likhupike', 'Khumbu Pasanglhamu'],
  'Okhaldhunga': ['Siddhicharan', 'Champadevi', 'Sunkoshi', 'Likhu', 'Chisankhugadhi', 'Molung', 'Khijidemba', 'Manebhanjyang'],
  'Khotang': ['Diktel', 'Halesi Tuwachung', 'Khotehang', 'Diprung Chuichumma', 'Aiselukharka', 'Jantedhunga', 'Kepilasgadhi', 'Sakela', 'Barahapokhari', 'Rawabesi'],
  'Bhojpur': ['Bhojpur', 'Shadananda', 'Tyamkemaiyum', 'Arun', 'Pauwadungma', 'Salpasilichho', 'Aamchowk', 'Hatuwagadhi', 'Ramprasad Rai'],
  'Dhankuta': ['Dhankuta', 'Pakhribas', 'Mahalaxmi', 'Sangurigadhi', 'Chhathar Jorpati', 'Shahidbhumi', 'Chaubise'],
  'Terhathum': ['Myanglung', 'Laligurans', 'Aathrai', 'Chhathar', 'Phedap', 'Menchhayayem'],
  'Panchthar': ['Phidim', 'Hilihang', 'Kummayak', 'Miklajung', 'Phalgunanda', 'Phalelung', 'Yangwarak', 'Tumbewa'],
  'Ilam': ['Ilam', 'Deumai', 'Mai', 'Suryodaya', 'Phakphokthum', 'Maijogmai', 'Chulachuli', 'Rong', 'Mangsebung', 'Sandakpur'],
  'Jhapa': ['Mechinagar', 'Damak', 'Bhadrapur', 'Birtamod', 'Arjundhara', 'Kankai', 'Shivasatakshi', 'Gauradaha', 'Kamal', 'Buddhashanti', 'Haldibari', 'Barhadashi', 'Jhapa', 'Kachankawal', 'Gaurigunj'],
  'Morang': ['Biratnagar', 'Sunwarshi', 'Belbari', 'Pathari Shanishchare', 'Urlabari', 'Rangeli', 'Letang', 'Ratuwamai', 'Sundarharaicha', 'Kerabari', 'Budhiganga', 'Kanepokhari', 'Gramthan', 'Katahari', 'Dhanpalthan', 'Jahada', 'Miklajung'],
  'Sunsari': ['Itahari', 'Dharan', 'Inaruwa', 'Duhabi', 'Ramdhuni', 'Barahakshetra', 'Koshi', 'Gadhi', 'Barju', 'Bhokraha Narsingh', 'Harinagara', 'Dewanganj'],
  'Udayapur': ['Gaighat', 'Triyuga', 'Katari', 'Chaudandigadhi', 'Belaka', 'Udayapurgadhi', 'Rautamai', 'Limchungbung'],
  'Saptari': ['Rajbiraj', 'Kanchanrup', 'Dakneshwori', 'Saptakoshi', 'Surunga', 'Shambhunath', 'Balan Bihul', 'Bishnupur', 'Khadak', 'Agnisair Krishnasavaran', 'Bode Barsain', 'Hanumannagar Kankalini', 'Mahadeva', 'Rupani', 'Tilathi Koiladi', 'Tirahut', 'Chhinnamasta'],
  'Siraha': ['Siraha', 'Lahan', 'Golbazar', 'Mirchaiya', 'Dhangadhimai', 'Kalyanpur', 'Karjanha', 'Sukhipur', 'Bhagwanpur', 'Aurahi', 'Bishnupur', 'Bariyarpatti', 'Lakshmipur Patari', 'Naraha', 'Sakhuwanankar Katti', 'Arnama', 'Nachhap'],
  'Dhanusha': ['Janakpur', 'Chhireshwornath', 'Ganeshman Charnath', 'Dhanushadham', 'Nagarain', 'Bideha', 'Mithila', 'Sabaila', 'Kamala', 'Bateshwar', 'Janaknandini', 'Hansapur', 'Mithila Bihari', 'Mukhiyapatti Musaharmiya', 'Lakshminya', 'Aaurahi'],
  'Mahottari': ['Jaleshwar', 'Bardibas', 'Gaushala', 'Loharpatti', 'Ramgopalpur', 'Aurahi', 'Balwa', 'Bhangaha', 'Ekdara', 'Mahottari', 'Manra Siswa', 'Matihani', 'Pipra', 'Samsi', 'Sonama'],
  'Sarlahi': ['Malangwa', 'Barahathwa', 'Haripur', 'Ishworpur', 'Lalbandi', 'Godaita', 'Bagmati', 'Balara', 'Bishnu', 'Brahmpuri', 'Chakraghatta', 'Chandranagar', 'Dhankaul', 'Haripurwa', 'Kabilasi', 'Kaudena', 'Parsa', 'Ramnagar'],
  'Rautahat': ['Gaur', 'Chandrapur', 'Garuda', 'Gujara', 'Baudhimai', 'Brindaban', 'Dewahi Gonahi', 'Durga Bhagwati', 'Ishanath', 'Katahariya', 'Madhav Narayan', 'Maulapur', 'Paroha', 'Phatuwa Bijayapur', 'Rajdevi', 'Rajpur', 'Yamunamai'],
  'Bara': ['Kalaiya', 'Jitpur Simara', 'Kolhabi', 'Nijgadh', 'Mahagadhimai', 'Simraungadh', 'Pachrauta', 'Pheta', 'Prasauni', 'Adarsha Kotwal', 'Baragadhi', 'Devtal', 'Karaiyamai', 'Parwanipur', 'Suwarna', 'Bishrampur'],
  'Parsa': ['Birgunj', 'Pokhariya', 'Bahudarmai', 'Parsagadhi', 'Bindabasini', 'Chhipaharmai', 'Dhobini', 'Jagarnathpur', 'Jirabhawani', 'Kalikamai', 'Pakaha Mainpur', 'Paterwa Sugauli', 'Sakhuwa Prasauni', 'Thori'],
  'Dolakha': ['Charikot', 'Bhimeshwor', 'Jiri', 'Melung', 'Bigu', 'Gaurishankar', 'Kalinchok', 'Tamakoshi', 'Baiteshwor', 'Sailung', 'Shailung'],
  'Sindhupalchok': ['Chautara', 'Melamchi', 'Bahrabise', 'Barhabise', 'Indrawati', 'Jugal', 'Panchpokhari Thangpal', 'Helambu', 'Bhotekoshi', 'Lisankhu Pakhar', 'Sunkoshi', 'Tripurasundari'],
  'Rasuwa': ['Dhunche', 'Gosaikunda', 'Kalika', 'Naukunda', 'Uttargaya', 'Amachodingmo'],
  'Dhading': ['Dhading Besi', 'Nilkantha', 'Dhunibesi', 'Galchi', 'Benighat Rorang', 'Gajuri', 'Gangajamuna', 'Jwalamukhi', 'Khaniyabas', 'Netrawati Dabjong', 'Rubi Valley', 'Siddhalek', 'Thakre', 'Tripurasundari'],
  'Nuwakot': ['Bidur', 'Belkotgadhi', 'Kakani', 'Tadi', 'Dupcheshwar', 'Kispang', 'Likhu', 'Meghang', 'Panchakanya', 'Shivapuri', 'Suryagadhi', 'Tarkeshwar'],
  'Kathmandu': ['Kathmandu', 'Kirtipur', 'Madhyapur Thimi', 'Budhanilkantha', 'Chandragiri', 'Dakshinkali', 'Gokarneshwor', 'Kageshwori Manohara', 'Nagarjun', 'Shankarapur', 'Tarakeshwor', 'Tokha'],
  'Bhaktapur': ['Bhaktapur', 'Madhyapur Thimi', 'Suryabinayak', 'Changunarayan'],
  'Lalitpur': ['Lalitpur', 'Godavari', 'Mahalaxmi', 'Konjyosom', 'Bagmati', 'Mahankal'],
  'Kavrepalanchok': ['Dhulikhel', 'Banepa', 'Panauti', 'Panchkhal', 'Namobuddha', 'Bethanchowk', 'Bhumlu', 'Chaurideurali', 'Khanikhola', 'Mahabharat', 'Mandandeupur', 'Roshi', 'Temal'],
  'Ramechhap': ['Manthali', 'Ramechhap', 'Doramba', 'Gokulganga', 'Khandadevi', 'Likhu Tamakoshi', 'Sunapati', 'Umakunda'],
  'Sindhuli': ['Sindhuli', 'Kamalamai', 'Dudhauli', 'Sunkoshi', 'Hariharpurgadhi', 'Golanjor', 'Ghyanglekh', 'Marin', 'Phikkal', 'Tinpatan'],
  'Makwanpur': ['Hetauda', 'Thaha', 'Bhimphedi', 'Makawanpurgadhi', 'Bakaiya', 'Bagmati', 'Indrasarowar', 'Kailash', 'Manahari', 'Raksirang'],
  'Chitwan': ['Bharatpur', 'Ratnanagar', 'Khairahani', 'Madi', 'Rapti', 'Kalika', 'Ichchhakamana'],
  'Gorkha': ['Gorkha', 'Palungtar', 'Sulikot', 'Siranchok', 'Ajirkot', 'Aarughat', 'Barpak Sulikot', 'Bhimsen Thapa', 'Chum Nubri', 'Dharche', 'Gandaki', 'Sahid Lakhan'],
  'Kaski': ['Pokhara', 'Annapurna', 'Machhapuchchhre', 'Madi', 'Rupa'],
  'Lamjung': ['Besisahar', 'Sundarbazar', 'Rainas', 'Madhya Nepal', 'Dordi', 'Dudhpokhari', 'Kwholasothar', 'Marsyangdi'],
  'Tanahu': ['Damauli', 'Byas', 'Shuklagandaki', 'Bhanu', 'Bhimad', 'Devghat', 'Bandipur', 'Ghiring', 'Myagde', 'Rishing'],
  'Nawalpur': ['Kawasoti', 'Gaindakot', 'Devchuli', 'Madhyabindu', 'Bulingtar', 'Binayi Triveni', 'Baudikali', 'Hupsekot'],
  'Syangja': ['Putalibazar', 'Galyang', 'Chapakot', 'Waling', 'Bhirkot', 'Harinas', 'Biruwa', 'Aandhikhola', 'Arjunchaupari', 'Kaligandaki', 'Phedikhola'],
  'Parbat': ['Kusma', 'Phalebas', 'Jaljala', 'Mahashila', 'Modi', 'Paiyun', 'Bihadi'],
  'Baglung': ['Baglung', 'Dhorpatan', 'Galkot', 'Jaimini', 'Bareng', 'Kathekhola', 'Nisikhola', 'Taman Khola', 'Tara Khola', 'Badigad'],
  'Rupandehi': ['Butwal', 'Siddharthanagar', 'Devdaha', 'Lumbini Sanskritik', 'Sainamaina', 'Tilottama', 'Gaidhawa', 'Kanchan', 'Kotahimai', 'Marchawari', 'Mayadevi', 'Omsatiya', 'Rohini', 'Sammarimai', 'Siyari', 'Sudhdhodhan'],
  'Kapilvastu': ['Kapilvastu', 'Banganga', 'Buddhabhumi', 'Shivaraj', 'Maharajganj', 'Krishnanagar', 'Mayadevi', 'Bijaynagar', 'Suddhodhan', 'Yasodhara'],
  'Dang': ['Ghorahi', 'Tulsipur', 'Lamahi', 'Bangalachuli', 'Dangisharan', 'Gadhawa', 'Rajpur', 'Rapti', 'Shantinagar'],
  'Banke': ['Nepalgunj', 'Kohalpur', 'Narainapur', 'Rapti Sonari', 'Baijanath', 'Duduwa', 'Janaki', 'Khajura'],
  'Bardiya': ['Gulariya', 'Rajapur', 'Madhuwan', 'Thakurbaba', 'Bansgadhi', 'Barbardiya', 'Badhaiyatal', 'Geruwa'],
  'Nawalparasi West': ['Ramgram', 'Sunwal', 'Bardaghat', 'Susta', 'Pratappur', 'Sarawal', 'Palhi Nandan'],
  'Surkhet': ['Birendranagar', 'Bheriganga', 'Gurbhakot', 'Panchapuri', 'Lekbeshi', 'Barahatal', 'Chaukune', 'Chingad', 'Simta'],
  'Kailali': ['Dhangadi', 'Tikapur', 'Ghodaghodi', 'Lamkichuha', 'Bhajani', 'Godawari', 'Gauriganga', 'Janaki', 'Joshipur', 'Kailari', 'Mohanyal', 'Bardagoriya', 'Chure'],
  'Kanchanpur': ['Bhimdatta', 'Mahakali', 'Shuklaphanta', 'Bedkot', 'Belauri', 'Punarbas', 'Krishnapur', 'Laljhadi', 'Beldandi'],
  'Dadeldhura': ['Amargadhi', 'Parshuram', 'Aalitaal', 'Bhageshwar', 'Navadurga', 'Ajayameru', 'Ganyapadhura'],
  'Baitadi': ['Dasharathchand', 'Patan', 'Melauli', 'Purchaudi', 'Dogadakedar', 'Dilasaini', 'Pancheshwar', 'Shivanath', 'Sigas', 'Surnaya'],
  'Darchula': ['Mahakali', 'Shailysashikhar', 'Malikarjun', 'Marma', 'Lekam', 'Naugad', 'Byas', 'Dunhu', 'Apihimal'],
};

export default function Checkout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { cart, clearCart }   = useCart()
  const { isLoggedIn, user }  = useAuthStore()

  const [currentStep,   setCurrentStep]   = useState(1)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [error,         setError]         = useState('')

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: user?.email || '', phone: '',
    address: '', city: '', district: '', description: '',
    paymentMethod: 'cod',
  })

  // ── Breakdown state (from server) ────────────────────────────────────────
  const [breakdown,        setBreakdown]        = useState(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownError,   setBreakdownError]   = useState('')

  // ── Coupon state ─────────────────────────────────────────────────────────
  const [appliedCouponCode, setAppliedCouponCode] = useState(() => {
    if (location.state?.appliedCoupon?.code) return location.state.appliedCoupon.code
    try { return sessionStorage.getItem('epasaley_coupon') || '' } catch { return '' }
  })
  const [couponInput,   setCouponInput]   = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError,   setCouponError]   = useState('')

  // ── Fetch breakdown from server ──────────────────────────────────────────
  const fetchBreakdown = useCallback(async (couponCode = '') => {
    if (!cart.length) { setBreakdown(null); return }
    setBreakdownLoading(true)
    setBreakdownError('')
    try {
      const res = await userApi.post('/orders/calculate-total', {
        cartItems:  cart.map(i => ({ productId: i.id || i._id, quantity: i.quantity })),
        couponCode: couponCode || undefined,
        userId:     user?.id    || undefined,
        email:      formData.email || user?.email || undefined,
        phone:      formData.phone || undefined,
      })
      const data = res.data?.data ?? res.data
      setBreakdown(data)
      return data
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not calculate total. Check your connection.'
      setBreakdownError(msg)
      return null
    } finally {
      setBreakdownLoading(false)
    }
  }, [cart, user, formData.email, formData.phone])

  // Refetch when cart changes (debounced)
  const cartKey = cart.map(i => `${i.id||i._id}:${i.quantity}`).join(',')
  const cartKeyRef = useRef(cartKey)
  useEffect(() => {
    if (!cart.length) { setBreakdown(null); return }
    const timer = setTimeout(() => {
      cartKeyRef.current = cartKey
      fetchBreakdown(appliedCouponCode)
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey])

  // Initial fetch on mount
  useEffect(() => {
    fetchBreakdown(appliedCouponCode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Coupon actions ────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true); setCouponError('')
    const code = couponInput.trim().toUpperCase()
    const data = await fetchBreakdown(code)
    if (data) {
      if (data.couponError) {
        setCouponError(data.couponError)
        // Revert breakdown to no-coupon state
        fetchBreakdown('')
      } else if (data.couponCode) {
        setAppliedCouponCode(code)
        setCouponInput('')
        try { sessionStorage.setItem('epasaley_coupon', code) } catch {}
      }
    }
    setCouponLoading(false)
  }

  const removeCoupon = () => {
    setAppliedCouponCode('')
    setCouponError('')
    try { sessionStorage.removeItem('epasaley_coupon') } catch {}
    fetchBreakdown('')
  }

  // ── Derived totals (from breakdown, with local fallback when API fails) ──
  const subtotal       = breakdown?.subtotal      ?? cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const couponDiscount = breakdown?.couponDiscount ?? 0
  const discountedSub  = subtotal - couponDiscount
  const vatAmount      = breakdown?.vatAmount      ?? (breakdown == null ? Math.round(discountedSub * 0.13) : 0)
  const shipping       = breakdown?.shipping       ?? (discountedSub >= 5000 ? 0 : 150)
  const shippingNote   = breakdown?.shippingNote   ?? ''
  const total          = breakdown?.total          ?? (discountedSub + vatAmount + shipping)

  // ── Form helpers ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      name: (name === 'first_name' || name === 'last_name')
        ? `${name === 'first_name' ? value : prev.first_name} ${name === 'last_name' ? value : prev.last_name}`.trim()
        : prev.name
    }))
  }

  const validateStep = () => {
    setError('')
    if (!formData.first_name || !formData.last_name || !formData.phone || !formData.email) {
      setError('Please fill all personal details'); return false
    }
    if (!formData.address || !formData.district || !formData.city) {
      setError('Complete shipping address is required'); return false
    }
    if (!formData.description) {
      setError('Add delivery note (e.g. near temple, call before delivery)'); return false
    }
    return true
  }

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!validateStep()) return
    if (!breakdown) {
      setError('Please wait for the price calculation to complete.'); return
    }

    setIsProcessing(true)
    try {
      await new Promise(r => setTimeout(r, 1200))

      const orderData = {
        first_name:    formData.first_name,
        last_name:     formData.last_name,
        name:          `${formData.first_name} ${formData.last_name}`,
        email:         formData.email,
        phone:         formData.phone,
        district:      formData.district,
        city:          formData.city,
        address:       formData.address,
        description:   formData.description || 'No notes',
        // Contract: items carry ONLY productId + quantity. The server resolves
        // names, prices and images from the catalogue — nothing here is trusted.
        items: cart.map(i => ({
          productId: i.id || i._id,
          quantity:  Number(i.quantity),
        })),
        totalAmount:   Math.round(breakdown.total),
        paymentMethod: 'cod',
        ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}),
        // user_id is derived server-side from the JWT — never sent in the body.
      }

      const res = await orderApi.create(orderData)
      const orderResponse = res.data?.data || res.data?.order || res.data
      const orderId = res.data?.data?.id || orderResponse?.id || null
      if (!orderId) {
        // Never fabricate an order number — if we can't read the id the user
        // should not see a fake confirmation.
        throw new Error('Order was created but no order id was returned. Please check your order history.')
      }
      const finalOrderId = orderId

      clearCart()
      try { sessionStorage.removeItem('epasaley_coupon') } catch {}

      navigate(`/order-success/${finalOrderId}`, {
        state: {
          order: {
            ...orderResponse,
            id: finalOrderId, orderId: finalOrderId,
            name: `${formData.first_name} ${formData.last_name}`.trim(),
            first_name: formData.first_name, last_name: formData.last_name,
            phone: formData.phone, district: formData.district,
            city: formData.city, address: formData.address,
            description: formData.description,
            items: orderResponse?.items?.length ? orderResponse.items : orderData.items,
            subtotal, shipping,
            vatAmount, couponDiscount,
            total: breakdown.total, totalAmount: breakdown.total,
            paymentMethod: formData.paymentMethod,
            orderDate: orderResponse?.createdAt || orderResponse?.created_at || new Date().toISOString(),
            status: orderResponse?.status || 'pending',
          },
        },
      })
    } catch (err) {
      const msg = err.response?.data?.message || 'Order failed. Please try again.'
      // If price changed since we calculated, refetch and show info
      if (msg.toLowerCase().includes('mismatch')) {
        setError('Prices may have changed. Recalculating...')
        await fetchBreakdown(appliedCouponCode)
        setError('Prices were updated. Please review and place the order again.')
      } else {
        setError(msg)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 bg-linear-to-b from-white to-gray-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-emerald-50 flex items-center justify-center">
            <ShoppingBag className="w-11 h-11 text-[#10B981]" />
          </div>
          <h2 className="mb-2 text-3xl font-extrabold text-gray-900">Your cart is empty</h2>
          <p className="mb-8 text-gray-500">Add a few items and come back to check out.</p>
          <button onClick={() => navigate('/products')}
            className="px-8 py-3.5 font-semibold text-white transition bg-[#1E293B] rounded-xl hover:bg-[#10B981]">
            Continue Shopping
          </button>
        </motion.div>
      </div>
    )
  }

  const StepDot = ({ n, label, icon: Icon }) => {
    const done = currentStep > n
    const active = currentStep === n
    return (
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold transition-all ${
          done ? 'bg-emerald-500 text-white' : active ? 'bg-[#1E293B] text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
        }`}>
          {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="hidden sm:block">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Step {n}</p>
          <p className={`text-sm font-bold ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
        </div>
      </div>
    )
  }

  const field = "w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#10B981] focus:bg-white transition"

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 sm:py-10">

        <button onClick={() => navigate('/cart')} className="flex items-center gap-1.5 mb-5 text-sm font-semibold text-gray-500 hover:text-[#1E293B] transition">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </button>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Checkout</h1>
        <p className="mt-1 mb-8 text-gray-500">{cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart</p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

          {/* ── Left: steps + forms ───────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Stepper */}
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <StepDot n={1} label="Shipping" icon={MapPin} />
              <div className={`flex-1 h-1 rounded-full ${currentStep > 1 ? 'bg-emerald-500' : 'bg-gray-100'}`} />
              <StepDot n={2} label="Payment" icon={CreditCard} />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </motion.div>
            )}

            {/* Step 1: shipping */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 sm:p-7 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <h2 className="flex items-center gap-2 mb-6 text-lg font-bold text-gray-900">
                  <MapPin className="w-5 h-5 text-[#10B981]" /> Shipping Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <input type="text" name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleInputChange} className={field} />
                  <input type="text" name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleInputChange} className={field} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className={field} />
                  <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className={field} />
                </div>
                <input type="text" name="address" placeholder="Full Address (House no, Tole, Ward)" value={formData.address} onChange={handleInputChange} className={`${field} mb-4`} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold text-gray-600">District</label>
                    <select name="district" value={formData.district} onChange={handleInputChange} className={field}>
                      <option value="">Select District</option>
                      {Object.keys(NEPAL_DISTRICTS).sort().map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-semibold text-gray-600">City / Municipality</label>
                    <select name="city" value={formData.city} onChange={handleInputChange} disabled={!formData.district} className={`${field} disabled:opacity-60`}>
                      <option>{formData.district ? 'Select City' : 'First select district'}</option>
                      {formData.district && NEPAL_DISTRICTS[formData.district].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <textarea name="description" placeholder="Delivery notes (e.g. call before delivery, near school, red gate)" value={formData.description} onChange={handleInputChange} rows={3} className={`${field} resize-none`} />
                <button onClick={() => validateStep() && setCurrentStep(2)}
                  className="flex items-center justify-center w-full gap-2 py-4 mt-6 text-base font-bold text-white transition bg-[#1E293B] shadow-sm hover:bg-[#10B981] rounded-xl">
                  Continue to Payment <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* Step 2: payment */}
            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 sm:p-7 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <h2 className="flex items-center gap-2 mb-6 text-lg font-bold text-gray-900">
                  <CreditCard className="w-5 h-5 text-[#10B981]" /> Payment Method
                </h2>
                <div className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition ${formData.paymentMethod === 'cod' ? 'border-[#10B981] bg-emerald-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleInputChange} className="w-5 h-5 accent-[#10B981]" />
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-100 text-[#10B981]"><Banknote className="w-6 h-6" /></span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">Cash on Delivery</p>
                      <p className="text-sm text-gray-500">Pay when you receive your order</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl bg-gray-50 opacity-60 cursor-not-allowed">
                    <input type="radio" disabled className="w-5 h-5" />
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-200 text-gray-400"><Lock className="w-5 h-5" /></span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">Khalti / eSewa <span className="ml-1 px-2 py-0.5 text-[10px] font-semibold text-gray-500 bg-gray-200 rounded-full align-middle">Coming Soon</span></p>
                      <p className="text-sm text-gray-500">Online payment coming soon</p>
                    </div>
                  </label>
                </div>

                {appliedCouponCode && breakdown?.couponDiscount > 0 && (
                  <div className="flex items-center justify-between p-4 mt-6 border border-emerald-200 bg-emerald-50 rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-emerald-800">
                      <Tag className="w-4 h-4" /> Coupon <span className="font-mono font-bold">{appliedCouponCode}</span> applied
                    </div>
                    <span className="text-sm font-bold text-emerald-700">−Rs. {breakdown.couponDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 mt-7">
                  <button onClick={() => setCurrentStep(1)} className="px-6 py-3.5 font-semibold text-gray-700 transition border-2 border-gray-200 rounded-xl hover:bg-gray-50">
                    Back to Shipping
                  </button>
                  <button onClick={() => handlePlaceOrder()} disabled={isProcessing || breakdownLoading || !breakdown}
                    className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-base font-bold text-white rounded-xl transition shadow-sm bg-[#10B981] hover:bg-[#059669] ${(isProcessing || breakdownLoading || !breakdown) && 'opacity-70 cursor-not-allowed'}`}>
                    {isProcessing ? (<>Processing <Loader2 className="w-5 h-5 animate-spin" /></>)
                      : breakdownLoading ? (<>Calculating… <Loader2 className="w-5 h-5 animate-spin" /></>)
                      : (<>Place Order · Rs. {total.toLocaleString()}</>)}
                  </button>
                </div>
                <p className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Your details are safe and never shared.
                </p>
              </motion.div>
            )}
          </div>

          {/* ── Right: order summary ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 p-5 sm:p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Order Summary</h2>

              <div className="mb-4 space-y-3 overflow-y-auto max-h-64 pr-1">
                {cart.map(item => {
                  const serverItem = breakdown?.items?.find(si => si.productId === (item.id || item._id))
                  const displayPrice = serverItem?.resolvedPrice ?? item.price
                  const origPrice    = serverItem?.originalPrice  ?? item.price
                  const hasSalePrice = serverItem && serverItem.resolvedPrice < serverItem.originalPrice
                  return (
                    <div key={item.id || item._id} className="flex gap-3">
                      <div className="relative shrink-0 w-16 h-16 overflow-hidden bg-gray-50 border border-gray-100 rounded-xl">
                        <img src={getImageUrl(item.image)} alt={item.name} className="object-contain w-full h-full p-1" />
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-5 h-5 px-1 text-[11px] font-bold text-white bg-[#1E293B] rounded-full">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-sm font-bold text-gray-900">Rs. {(displayPrice * item.quantity).toLocaleString()}</span>
                          {hasSalePrice && <span className="text-xs text-gray-400 line-through">Rs. {(origPrice * item.quantity).toLocaleString()}</span>}
                        </div>
                        {serverItem?.discountSource && serverItem.discountSource !== 'original' && (
                          <span className="text-[10px] font-semibold text-[#10B981] capitalize">{serverItem.discountSource.replace('_', ' ')}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Coupon */}
              <div className="py-4 border-y border-gray-100">
                {!appliedCouponCode ? (
                  <div className="flex gap-2">
                    <input value={couponInput} onChange={e => { setCouponInput(e.target.value.toUpperCase()); }} onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="Coupon code" className="flex-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#10B981]" />
                    <button onClick={applyCoupon} disabled={couponLoading}
                      className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1E293B] rounded-xl hover:bg-[#10B981] disabled:opacity-60 flex items-center gap-1.5">
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />} Apply
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <Tag className="w-4 h-4" /> <span className="font-mono">{appliedCouponCode}</span>
                      {breakdown?.couponDiscount > 0 && <span className="font-normal">· −Rs. {breakdown.couponDiscount.toLocaleString()}</span>}
                    </span>
                    <button onClick={removeCoupon} className="text-emerald-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                )}
                {couponError && <p className="mt-2 text-xs font-medium text-red-500">{couponError}</p>}
              </div>

              {/* Breakdown */}
              <div className="py-4 space-y-2.5 text-sm">
                {breakdownLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Calculating…</div>
                ) : breakdownError ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 px-3 py-2 text-xs text-red-600 border border-red-100 rounded-lg bg-red-50">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {breakdownError}
                    </div>
                    <button onClick={() => fetchBreakdown(appliedCouponCode)} className="w-full py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Retry calculation</button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between font-medium text-emerald-600"><span>Coupon ({appliedCouponCode})</span><span>−Rs. {couponDiscount.toLocaleString()}</span></div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between pt-2 text-gray-700 border-t border-dashed border-gray-200"><span>Discounted Subtotal</span><span>Rs. {(breakdown?.discountedSubtotal ?? discountedSub).toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span className="flex items-center gap-1">VAT (13%) <Info className="w-3 h-3 text-gray-400" title="VAT on discounted amount" /></span>
                      <span>+Rs. {vatAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span className={shipping === 0 ? 'text-emerald-600 font-semibold' : ''}>{shipping === 0 ? 'FREE' : `Rs. ${shipping.toLocaleString()}`}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-extrabold text-gray-900">{breakdownLoading ? <Loader2 className="inline w-5 h-5 text-gray-400 animate-spin" /> : `Rs. ${total.toLocaleString()}`}</span>
              </div>

              {shipping === 0 && !breakdownLoading && (
                <div className="flex items-center justify-center gap-2 p-3 mt-4 text-sm font-semibold border text-emerald-700 border-emerald-200 bg-emerald-50 rounded-xl">
                  <Truck className="w-4 h-4" /> Free shipping applied!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
