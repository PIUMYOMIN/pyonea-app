<?php
declare(strict_types=1);

const PYONEA_SITE_URL = 'https://pyonea.com';
const PYONEA_API_BASE = 'https://api.pyonea.com/api/v1';
const PYONEA_DEFAULT_IMAGE = 'https://pyonea.com/og-image.png';

$crawlerAgents = [
    'facebookexternalhit', 'Facebot', 'Twitterbot', 'WhatsApp',
    'TelegramBot', 'LinkedInBot', 'Slackbot', 'viber', 'vkShare',
    'Pinterest', 'Googlebot', 'bingbot', 'Discordbot', 'Snapchat',
];

$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isCrawler = false;
foreach ($crawlerAgents as $bot) {
    if (stripos($userAgent, $bot) !== false) {
        $isCrawler = true;
        break;
    }
}

if (!$isCrawler) {
    readfile(__DIR__ . '/index.html');
    exit;
}

$requestUri = str_replace("\0", '', $_SERVER['REQUEST_URI'] ?? '/');
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$path = str_replace("\0", '', $path);
$decodedPath = str_replace("\0", '', rawurldecode($path));

$hasUnsafePath = (
    strpos($decodedPath, '@') !== false ||
    strpos($decodedPath, '//') !== false ||
    strpos($decodedPath, '..') !== false ||
    strpos($decodedPath, '\\') !== false
);

$queryParams = [];
parse_str(str_replace("\0", '', $_SERVER['QUERY_STRING'] ?? ''), $queryParams);
$lang = (isset($queryParams['lang']) && in_array($queryParams['lang'], ['en', 'my'], true))
    ? $queryParams['lang']
    : 'my';

if ($hasUnsafePath) {
    readfile(__DIR__ . '/index.html');
    exit;
}

if (preg_match('#^/products/([^/]+)/?$#', $decodedPath, $matches)) {
    renderProductOg($matches[1], $lang);
    exit;
}

if (preg_match('#^/sellers/([^/]+)/?$#', $decodedPath, $matches)) {
    renderSellerOg($matches[1], $lang);
    exit;
}

if (preg_match('#^/blog/([^/]+)/?$#', $decodedPath, $matches)) {
    renderBlogOg($matches[1], $lang);
    exit;
}

if (renderStaticRouteOg($decodedPath, $lang)) {
    exit;
}

readfile(__DIR__ . '/index.html');
exit;

function renderProductOg(string $slug, string $lang): void
{
    $payload = apiGet('/products/' . rawurlencode($slug));
    $product = is_array($payload['data'] ?? null) ? $payload['data'] : null;

    if (!$product) {
        readfile(__DIR__ . '/index.html');
        return;
    }

    $displayName = pickLocalized(
        $lang,
        (string) ($product['name_en'] ?? $product['name'] ?? 'Product'),
        (string) ($product['name_mm'] ?? $product['name_en'] ?? $product['name'] ?? 'Product')
    );
    $displayDesc = pickLocalized(
        $lang,
        (string) ($product['description_en'] ?? ''),
        (string) ($product['description_mm'] ?? $product['description_en'] ?? '')
    );
    $moq = (int) ($product['moq'] ?? $product['minimum_order_quantity'] ?? 1);
    $canonicalSlug = (string) ($product['slug_en'] ?? $product['slug'] ?? $slug);

    if ($lang === 'my') {
        $title = $displayName . ' | မြန်မာ လက်ကား | Pyonea';
        $description = $displayName
            . ' ကို မြန်မာနိုင်ငံတွင် လက်ကားဝယ်ယူရန်။ အနည်းဆုံးမှာယူရမည့် အရေအတွက် '
            . $moq
            . '၊ လက်ကားဈေး၊ ရောင်းချသူအချက်အလက်နှင့် လုံခြုံသော မှာယူမှုများကို Pyonea တွင် ကြည့်ရှုပါ။';
    } else {
        $title = $displayName . ' | Wholesale Myanmar | Pyonea';
        $description = $displayName
            . ' wholesale in Myanmar. Check MOQ '
            . $moq
            . ', bulk price, supplier details, and secure ordering on Pyonea.';
    }

    if ($displayDesc !== '') {
        $description = compactText($description . ' ' . strip_tags(str_replace(["\r", "\n"], ' ', $displayDesc)), 155);
    } else {
        $description = compactText($description, 155);
    }

    outputOgHtml([
        'lang' => $lang,
        'title' => $title,
        'description' => $description,
        'url' => PYONEA_SITE_URL . '/products/' . rawurlencode($canonicalSlug) . '?lang=' . $lang,
        'image' => resolveProductImage($product),
        'type' => 'product',
    ]);
}

function renderSellerOg(string $slug, string $lang): void
{
    $payload = apiGet('/sellers/' . rawurlencode($slug) . '?page=1&per_page=1');
    $data = is_array($payload['data'] ?? null) ? $payload['data'] : $payload;
    $seller = is_array($data['seller'] ?? null) ? $data['seller'] : null;

    if (!$seller) {
        readfile(__DIR__ . '/index.html');
        return;
    }

    $displayName = pickLocalized(
        $lang,
        (string) ($seller['store_name'] ?? $seller['business_name'] ?? $seller['name'] ?? 'Seller'),
        (string) ($seller['store_name'] ?? $seller['business_name'] ?? $seller['name'] ?? 'Seller')
    );
    $displayDesc = (string) ($seller['description'] ?? $seller['store_description'] ?? '');
    $canonicalSlug = (string) ($seller['store_slug'] ?? $seller['slug'] ?? $slug);

    $title = $displayName . ' | Verified Myanmar Supplier | Pyonea';
    $description = $lang === 'my'
        ? $displayName . ' ၏ ကုန်ပစ္စည်းများ၊ လုပ်ငန်းအချက်အလက်များနှင့် လက်ကားရောင်းချသူ profile ကို Pyonea တွင် ကြည့်ရှုပါ။'
        : 'View ' . $displayName . ' products, business details, and wholesale seller profile on Pyonea.';

    if ($displayDesc !== '') {
        $description = compactText($description . ' ' . strip_tags(str_replace(["\r", "\n"], ' ', $displayDesc)), 155);
    } else {
        $description = compactText($description, 155);
    }

    $image = resolveAbsoluteUrl((string) ($seller['banner_url'] ?? $seller['banner'] ?? $seller['logo_url'] ?? $seller['logo'] ?? ''));

    outputOgHtml([
        'lang' => $lang,
        'title' => $title,
        'description' => $description,
        'url' => PYONEA_SITE_URL . '/sellers/' . rawurlencode($canonicalSlug) . '?lang=' . $lang,
        'image' => $image !== '' ? $image : PYONEA_DEFAULT_IMAGE,
        'type' => 'profile',
    ]);
}

function renderBlogOg(string $slug, string $lang): void
{
    $payload = apiGet('/blog/' . rawurlencode($slug));
    $post = is_array($payload['data'] ?? null) ? $payload['data'] : (is_array($payload) ? $payload : null);

    if (!$post) {
        readfile(__DIR__ . '/index.html');
        return;
    }

    $displayTitle = pickLocalized(
        $lang,
        (string) ($post['seo_title_en'] ?? $post['title_en'] ?? $post['title'] ?? 'Blog post'),
        (string) ($post['seo_title_mm'] ?? $post['title_mm'] ?? $post['title_en'] ?? $post['title'] ?? 'Blog post')
    );
    $displayDesc = pickLocalized(
        $lang,
        (string) ($post['seo_description_en'] ?? $post['excerpt_en'] ?? $post['excerpt'] ?? ''),
        (string) ($post['seo_description_mm'] ?? $post['excerpt_mm'] ?? $post['excerpt_en'] ?? $post['excerpt'] ?? '')
    );
    $canonicalSlug = (string) ($post['slug'] ?? $slug);

    $title = $displayTitle . ' | Pyonea Blog';
    $description = $displayDesc !== ''
        ? compactText($displayDesc, 155)
        : compactText(
            $lang === 'my'
                ? $displayTitle . ' ကို Pyonea တွင် ဖတ်ရှုပါ။'
                : 'Read ' . $displayTitle . ' on Pyonea.',
            155
        );

    $image = resolveAbsoluteUrl((string) ($post['featured_image'] ?? $post['image_url'] ?? ''));

    outputOgHtml([
        'lang' => $lang,
        'title' => $title,
        'description' => $description,
        'url' => PYONEA_SITE_URL . '/blog/' . rawurlencode($canonicalSlug) . '?lang=' . $lang,
        'image' => $image !== '' ? $image : PYONEA_DEFAULT_IMAGE,
        'type' => 'article',
    ]);
}

function renderStaticRouteOg(string $path, string $lang): bool
{
    $normalized = rtrim($path, '/') ?: '/';
    $staticRoutes = [
        '/' => [
            'en' => ['Pyonea | Myanmar\'s B2B Wholesale Marketplace & Suppliers', 'Pyonea connects Myanmar businesses with verified suppliers. Find wholesale products, MOQ pricing, bulk orders, and trusted sellers across Myanmar.'],
            'my' => ['Pyonea | မြန်မာ့ B2B လက်ကားဈေးကွက်နှင့် Supplier များ', 'Pyonea သည် မြန်မာနိုင်ငံရှိ လုပ်ငန်းများကို အတည်ပြုထားသော Supplier များနှင့် ချိတ်ဆက်ပေးသည့် B2B လက်ကားဈေးကွက်ဖြစ်သည်။ MOQ၊ လက်ကားဈေးနှုန်း၊ အစုလိုက်မှာယူမှုနှင့် ယုံကြည်ရသော ရောင်းသူများကို တစ်နေရာတည်းတွင် ရှာဖွေနိုင်ပါသည်။'],
        ],
        '/products' => [
            'en' => ['Wholesale Products in Myanmar | Pyonea', 'Browse wholesale products from verified Myanmar suppliers. Compare MOQ, prices, seller profiles, and order securely on Pyonea.'],
            'my' => ['မြန်မာ့လက်ကားကုန်ပစ္စည်းများ | Pyonea', 'အတည်ပြုထားသော မြန်မာ့ Supplier များထံမှ လက်ကားကုန်ပစ္စည်းများကို ရှာဖွေပါ။ MOQ၊ လက်ကားဈေး၊ ရောင်းသူပရိုဖိုင်နှင့် အော်ဒါအချက်အလက်များကို နှိုင်းယှဉ်နိုင်ပါသည်။'],
        ],
        '/categories' => [
            'en' => ['Wholesale Categories in Myanmar | Pyonea', 'Browse Myanmar wholesale product categories on Pyonea including fashion, books, electronics, home goods, and business supplies.'],
            'my' => ['မြန်မာ့လက်ကားကုန်ပစ္စည်းအမျိုးအစားများ | Pyonea', 'Pyonea တွင် ဖက်ရှင်၊ စာအုပ်၊ အီလက်ထရောနစ်၊ အိမ်သုံးပစ္စည်းနှင့် လုပ်ငန်းသုံးပစ္စည်းများအပါအဝင် မြန်မာ့လက်ကားကုန်ပစ္စည်းအမျိုးအစားများကို ရှာဖွေပါ။'],
        ],
        '/sellers' => [
            'en' => ['Verified Myanmar Suppliers & Sellers | Pyonea', 'Discover verified Myanmar suppliers on Pyonea. View seller profiles, product lists, ratings, and wholesale business information.'],
            'my' => ['အတည်ပြုထားသော မြန်မာ Supplier များ | Pyonea', 'Pyonea ရှိ အတည်ပြုထားသော မြန်မာ Supplier နှင့် ရောင်းချသူများကို ရှာဖွေပါ။ ကုန်ပစ္စည်းစာရင်း၊ အဆင့်သတ်မှတ်ချက်နှင့် လုပ်ငန်းအချက်အလက်များကို ကြည့်ရှုနိုင်ပါသည်။'],
        ],
        '/local-deals' => [
            'en' => ['Local Deals | Pyonea', 'Browse active coupon offers from verified Myanmar sellers by region. Save on wholesale orders and support local businesses.'],
            'my' => ['ဒေသတွင်း အထူးဈေးနှုန်းများ | Pyonea', 'Pyonea မှာ အတည်ပြုပြီးဖြစ်တဲ့ ရောင်းချသူတွေက ဒေသတစ်ခုချင်းအလိုက် ပေးထားတဲ့ အထူးဈေးတွေကို ရှာဖွေပြီး မှာယူနိုင်ပါတယ်။'],
        ],
        '/blog' => [
            'en' => ['Wholesale Myanmar Blog & Business Guides | Pyonea', 'Read Pyonea guides for Myanmar wholesale buying, supplier sourcing, online shops, B2B marketplace selling, MOQ, delivery, and business growth.'],
            'my' => ['မြန်မာ B2B ဘလောနှင့် လုပ်ငန်းလမ်းညွှန်များ | Pyonea', 'Myanmar လက်ကားဝယ်ယူခြင်း၊ supplier ရှာဖွေခြင်း၊ online shop၊ B2B marketplace ရောင်းချခြင်း၊ MOQ၊ ပို့ဆောင်ရေးနှင့် လုပ်ငန်းကြီးထွားမှုအတွက် Pyonea လမ်းညွှန်များကို ဖတ်ရှုပါ။'],
        ],
        '/bulk-order-tool' => [
            'en' => ['Bulk Order Tool for Myanmar B2B Buyers | Pyonea', 'Request and compare bulk order options from Myanmar suppliers using Pyonea\'s B2B sourcing tool.'],
            'my' => ['အစုလိုက်မှာယူရေး Tool | Pyonea', 'Myanmar suppliers များထံမှ bulk order ရွေးချယ်မှုများကို Pyonea B2B sourcing tool ဖြင့် တောင်းဆိုပါ။'],
        ],
        '/pricing' => [
            'en' => ['Pricing & Plans | Pyonea Myanmar B2B Marketplace', 'Choose a seller plan that fits your business. Start free on Pyonea and upgrade as your store grows.'],
            'my' => ['ဈေးနှုန်းနှင့် အစီအစဉ်များ | Pyonea မြန်မာ B2B ဈေးကွက်', 'သင့်လုပ်ငန်းအတွက် သင့်တော်သော ရောင်းချသူအစီအစဉ်ကို ရွေးချယ်ပါ။ Pyonea တွင် အခမဲ့စတင်နိုင်ပြီး လုပ်ငန်းကြီးထွားလာသည်နှင့်အမျှ ပရီမီယမ်အစီအစဉ်များသို့ အဆင့်မြှင့်နိုင်ပါသည်။'],
        ],
        '/about-us' => [
            'en' => ['About Pyonea | Myanmar B2B Wholesale Marketplace', 'Pyonea is Myanmar\'s trusted B2B marketplace connecting verified suppliers with business buyers. Learn about our mission and commitment to Myanmar commerce.'],
            'my' => ['Pyonea အကြောင်း | Myanmar B2B Marketplace', 'Pyonea သည် မြန်မာနိုင်ငံရှိ စီးပွားရေးလုပ်ငန်းများအတွက် ယုံကြည်စိတ်ချရသော B2B ဈေးကွက်ဖြစ်ပြီး အတည်ပြုထားသော ရောင်းချသူများနှင့် ဝယ်ယူသူများကို ချိတ်ဆက်ပေးပါသည်။'],
        ],
        '/help' => [
            'en' => ['Help Center | Pyonea', 'Get help with buying, selling, bulk orders, shipping, payments, and account support on Pyonea.'],
            'my' => ['Help Center | Pyonea', 'Buying၊ selling၊ bulk orders၊ shipping၊ payments နှင့် account support အတွက် Pyonea Help Center ကို သုံးပါ။'],
        ],
        '/faq' => [
            'en' => ['FAQ | Pyonea Myanmar B2B Marketplace', 'Frequently asked questions about buying, selling, payments, shipping, and accounts on Pyonea, Myanmar\'s B2B wholesale marketplace.'],
            'my' => ['မေးလေ့ရှိသောမေးခွန်းများ | Pyonea မြန်မာ B2B ဈေးကွက်', 'Pyonea တွင် ဝယ်ယူခြင်း၊ ရောင်းချခြင်း၊ ငွေပေးချေမှု၊ ပို့ဆောင်ရေးနှင့် အကောင့်အသုံးပြုမှုဆိုင်ရာ မေးလေ့ရှိသောမေးခွန်းများကို လေ့လာပါ။'],
        ],
        '/shipping' => [
            'en' => ['Shipping Information | Pyonea Myanmar B2B Marketplace', 'Learn how shipping works on Pyonea, including delivery areas, estimated timelines, packaging standards, tracking, and support for lost or damaged orders.'],
            'my' => ['ပို့ဆောင်ရေးအချက်အလက် | Pyonea မြန်မာ B2B ဈေးကွက်', 'Pyonea တွင် ပို့ဆောင်ရေးလုပ်ငန်းစဉ်၊ ပို့ဆောင်နိုင်သောဒေသများ၊ ခန့်မှန်းချိန်များ၊ ထုပ်ပိုးမှုစံနှုန်းများနှင့် အော်ဒါပျောက်ဆုံးမှု သို့မဟုတ် ပျက်စီးမှုများအတွက် ဆောင်ရွက်ရမည့်အဆင့်များကို လေ့လာပါ။'],
        ],
        '/contact' => [
            'en' => ['Contact Pyonea | Myanmar B2B Marketplace Support', 'Contact Pyonea for buyer support, seller support, partnership questions, and Myanmar marketplace assistance.'],
            'my' => ['Pyonea ကို ဆက်သွယ်ရန် | Myanmar B2B Support', 'Buyer support၊ seller support၊ partnerships နှင့် marketplace assistance အတွက် Pyonea ကို ဆက်သွယ်ပါ။'],
        ],
        '/seller-guidelines' => [
            'en' => ['Seller Guidelines | Pyonea Myanmar B2B Marketplace', 'Everything you need to know to sell successfully on Pyonea: eligibility, product standards, prohibited items, performance requirements, and fees.'],
            'my' => ['ရောင်းချသူလမ်းညွှန်ချက်များ | Pyonea မြန်မာ B2B ဈေးကွက်', 'Pyonea တွင် ယုံကြည်စိတ်ချရသော ရောင်းချသူအဖြစ် စတင်နိုင်ရန် အတည်ပြုမှု၊ ကုန်ပစ္စည်းစံနှုန်း၊ တားမြစ်ပစ္စည်းများ၊ စွမ်းဆောင်ရည်လိုအပ်ချက်များနှင့် ဝန်ဆောင်ခများကို လေ့လာပါ။'],
        ],
        '/terms' => [
            'en' => ['Terms of Service | Pyonea', 'Read the Pyonea terms of service for buyers, sellers, and marketplace users.'],
            'my' => ['ဝန်ဆောင်မှုစည်းမျဉ်းများ | Pyonea', 'Pyonea marketplace buyers, sellers and users အတွက် Terms of Service.'],
        ],
        '/privacy-policy' => [
            'en' => ['Privacy Policy | Pyonea', 'Read how Pyonea protects buyer, seller, order, payment, delivery, and verification data on Myanmar\'s B2B wholesale marketplace.'],
            'my' => ['ကိုယ်ရေးအချက်အလက် မူဝါဒ | Pyonea', 'Pyonea မြန်မာ B2B လက်ကားဈေးကွက်တွင် ဝယ်သူ၊ ရောင်းသူ၊ အော်ဒါ၊ ငွေပေးချေမှု၊ ပို့ဆောင်ရေးနှင့် အတည်ပြုရေးဒေတာများကို ကာကွယ်အသုံးပြုပုံကို ဖတ်ရှုပါ။'],
        ],
        '/return-policy' => [
            'en' => ['Return & Refund Policy | Pyonea', 'Learn how returns, exchanges, refunds, seller policies, buyer responsibilities, and dispute support work on Pyonea\'s Myanmar B2B marketplace.'],
            'my' => ['ပြန်အမ်းခြင်း မူဝါဒ | Pyonea', 'Pyonea မြန်မာ B2B လက်ကားဈေးကွက်တွင် ပြန်ပေးပို့မှု၊ လဲလှယ်မှု၊ ငွေပြန်အမ်းမှု၊ ရောင်းသူမူဝါဒနှင့် အငြင်းပွားမှုကူညီဖြေရှင်းပုံကို လေ့လာပါ။'],
        ],
        '/legal' => [
            'en' => ['Legal Information | Pyonea', 'Pyonea\'s legal centre: terms of service, privacy policy, return policy, and platform guidelines for buyers and sellers on Myanmar\'s B2B marketplace.'],
            'my' => ['ဥပဒေဆိုင်ရာ အချက်အလက် | Pyonea', 'Pyonea ၏ ဝန်ဆောင်မှုသတ်မှတ်ချက်များ၊ ကိုယ်ရေးအချက်အလက်မူဝါဒ၊ ပြန်ပေးပို့မှုမူဝါဒနှင့် ဝယ်သူ/ရောင်းသူများအတွက် ပလက်ဖောင်းလမ်းညွှန်ချက်များကို လေ့လာပါ။'],
        ],
        '/compare' => [
            'en' => ['Product Comparison | Pyonea', 'Compare Myanmar wholesale products, pricing, sellers, and product details on Pyonea.'],
            'my' => ['ကုန်ပစ္စည်း နှိုင်းယှဉ်ခြင်း | Pyonea', 'Myanmar wholesale products, pricing နှင့် sellers များကို Pyonea တွင် နှိုင်းယှဉ်ပါ။'],
        ],
        '/report' => [
            'en' => ['Report a Marketplace Issue | Pyonea', 'Report product, seller, order, payment, or safety issues to Pyonea support and receive a ticket ID.'],
            'my' => ['Marketplace ပြဿနာ Report လုပ်ရန် | Pyonea', 'Report product, seller, order, payment, or safety issues to Pyonea support and receive a ticket ID.'],
        ],
    ];

    if (!isset($staticRoutes[$normalized])) {
        return false;
    }

    [$title, $description] = $staticRoutes[$normalized][$lang];
    outputOgHtml([
        'lang' => $lang,
        'title' => $title,
        'description' => $description,
        'url' => PYONEA_SITE_URL . $normalized . '?lang=' . $lang,
        'image' => PYONEA_DEFAULT_IMAGE,
        'type' => 'website',
    ]);

    return true;
}

function apiGet(string $path): ?array
{
    $url = PYONEA_API_BASE . $path;
    $context = stream_context_create([
        'http' => [
            'timeout' => 8,
            'header' => [
                'User-Agent: PyoneaOGProxy/2.0',
                'Accept: application/json',
            ],
        ],
    ]);

    $raw = @file_get_contents($url, false, $context);
    if ($raw === false) {
        return null;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function pickLocalized(string $lang, string $en, string $my): string
{
    if ($lang === 'my') {
        return $my !== '' ? $my : $en;
    }

    return $en !== '' ? $en : $my;
}

function compactText(string $value, int $limit = 155): string
{
    $clean = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    if ($clean === '') {
        return '';
    }

    if (function_exists('mb_strlen') && mb_strlen($clean) > $limit) {
        return rtrim(mb_substr($clean, 0, $limit - 1)) . '…';
    }

    if (strlen($clean) > $limit) {
        return rtrim(substr($clean, 0, $limit - 1)) . '…';
    }

    return $clean;
}

function resolveProductImage(array $product): string
{
    $images = $product['images'] ?? [];
    if (!is_array($images) || $images === []) {
        return PYONEA_DEFAULT_IMAGE;
    }

    $primary = $images[0];
    if (is_array($primary)) {
        $url = (string) ($primary['url'] ?? $primary['path'] ?? '');
        return $url !== '' ? resolveAbsoluteUrl($url) : PYONEA_DEFAULT_IMAGE;
    }

    return resolveAbsoluteUrl((string) $primary) ?: PYONEA_DEFAULT_IMAGE;
}

function resolveAbsoluteUrl(string $value): string
{
    if ($value === '') {
        return '';
    }

    if (preg_match('#^https?://#i', $value)) {
        return $value;
    }

    if (str_starts_with($value, '/storage/')) {
        return 'https://api.pyonea.com' . $value;
    }

    if (str_starts_with($value, '/')) {
        return PYONEA_SITE_URL . $value;
    }

    return 'https://api.pyonea.com/storage/' . ltrim($value, '/');
}

function outputOgHtml(array $meta): void
{
    $lang = $meta['lang'] === 'my' ? 'my' : 'en';
    $locale = $lang === 'my' ? 'my_MM' : 'en_US';
    $localeAlt = $lang === 'my' ? 'en_US' : 'my_MM';
    $title = htmlspecialchars($meta['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $description = htmlspecialchars($meta['description'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $url = htmlspecialchars($meta['url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $image = htmlspecialchars($meta['image'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $type = htmlspecialchars($meta['type'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    header('Content-Type: text/html; charset=UTF-8');
    echo <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="content-language" content="{$lang}" />
  <title>{$title}</title>
  <meta name="description" content="{$description}" />
  <meta property="og:type" content="{$type}" />
  <meta property="og:title" content="{$title}" />
  <meta property="og:description" content="{$description}" />
  <meta property="og:image" content="{$image}" />
  <meta property="og:image:secure_url" content="{$image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="{$url}" />
  <meta property="og:site_name" content="Pyonea" />
  <meta property="og:locale" content="{$locale}" />
  <meta property="og:locale:alternate" content="{$localeAlt}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{$title}" />
  <meta name="twitter:description" content="{$description}" />
  <meta name="twitter:image" content="{$image}" />
  <link rel="canonical" href="{$url}" />
</head>
<body><p>{$title}</p></body>
</html>
HTML;
}
