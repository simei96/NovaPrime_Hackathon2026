//Importaciones de la librería de React Native
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SkeletonLoader from "../../../components/ui/SkeletonLoader";
import { auth, db } from "../../../firebaseConfig";

// Paleta de color de la app
const COLOR_TEAL = "#2EAD9A";
const COLOR_ORANGE = "#D96E32";
const COLOR_OLIVE = "#8FB32E";

// Category Filter Bar
const CATEGORIAS = [
  { label: "Artesanias", icon: "palette", color: "#fff", slug: "artesania" },
  { label: "Gastronomia", icon: "food", color: "#fff", slug: "gastronomia" },
  { label: "Naturaleza", icon: "leaf", color: "#fff", slug: "naturalez" },
  { label: "Tradiciones", icon: "account-group", color: "#fff", slug: "tradiciones" },
  { label: "Danza y Musica", icon: "music", color: "#fff", slug: "danza y musica" },
  { label: "Historia", icon: "book", color: "#fff", slug: "historia" },
];

// Eventos del itinerario del día (Timeline Event Card).
// No existe todavía una colección en Firestore para esto, por lo que se
// deja como estructura estática lista para conectarse a datos reales.
const TIMELINE_EVENTS = [
  {
    id: "evt_1",
    allDay: true,
    title: "Recorrido cultural en el centro histórico",
    subtitle: "Punto de encuentro: Parque Central",
    color: COLOR_TEAL,
  },
  {
    id: "evt_2",
    allDay: false,
    time: "3:00 PM",
    title: "Tour gastronómico",
    subtitle: "Mercado de artesanías",
    color: COLOR_ORANGE,
  },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser || null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [promoTour, setPromoTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slidesLoaded, setSlidesLoaded] = useState([]);
  const [tourLoaded, setTourLoaded] = useState(false);

  // Category Filter Bar: categoría con indicador activo
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Peek Carousel: favoritos por índice de tarjeta
  const [favorites, setFavorites] = useState({});
  const [carouselData, setCarouselData] = useState
  ([
    {title: "Volcán Masaya", desc: "Naturaleza volcánica espectacular", badge: "Próximamente", btn: "Descubre Nicaragua", image: null},
    {title: "Naturaleza de cañon de Somoto", desc: "Aventura y paisajes únicos", badge: "Nuevo", btn: "Ver más", image: null},
  ]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const promoTourRef = doc(db, "Promociones", "Promo_003");
        const promoTourSnap = await getDoc(promoTourRef);
        if (promoTourSnap.exists()) setPromoTour(promoTourSnap.data());

        const logoRef = doc(db, "WelcomeSlide", "E6E9tiI2uJkTZqG5DcAC");
        const logoSnap = await getDoc(logoRef);
        if (logoSnap.exists()) setLogoUrl(logoSnap.data().ImagenURL);

        const volcanImgRef = doc(db, "CardPrincipal", "Card_002");
        const somotoImgRef = doc(db, "CardPrincipal", "Card_003");
        const volcanImgSnap = await getDoc(volcanImgRef);
        const somotoImgSnap = await getDoc(somotoImgRef);
        let newData = [...carouselData];
        if (volcanImgSnap.exists()) {
          newData[0].image = volcanImgSnap.data().ImagenURL;
          newData[0].title = volcanImgSnap.data().Nombre || newData[0].title;
        }
        if (somotoImgSnap.exists()) {
          newData[1].image = somotoImgSnap.data().ImagenURL;
          newData[1].title = somotoImgSnap.data().Nombre || newData[1].title;
        }
        setCarouselData(newData);
      } catch (error) {
        console.error("Error loading home data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    setSlidesLoaded((prev) =>
      prev.length === carouselData.length
        ? prev
        : Array(carouselData.length).fill(false),
    );
  }, [carouselData.length]);

  const windowWidth = Dimensions.get("window").width;
  const headerHeight = 38;
  const sectionSpacing = 10;

  // Dimensiones para el Peek / Snap Carousel
  const PEEK_CARD_WIDTH = Math.round(windowWidth * 0.72);
  const PEEK_CARD_GAP = 14;

  // Nombre a mostrar en el header: usuario registrado o invitación a iniciar sesión
  const headerDisplayName = user
    ? user.displayName || (user.email ? user.email.split("@")[0] : "Usuario")
    : "Inicia sesión";

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.headerFixed}>
        {loading ? (
          <View style={styles.headerSkeletonRow}>
            <SkeletonLoader
              height={18}
              width={130}
              style={{ borderRadius: 6 }}
            />
            <View style={{ flex: 1 }} />
            <SkeletonLoader
              height={30}
              width={100}
              style={{ borderRadius: 6 }}
            />
          </View>
        ) : (
          <View style={styles.headerRow}>
            {/* usuario registrado / inicia sesión */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (!user) {
                  router.push("/login");
                }
              }}
              style={styles.headerUserWrap}
            >
              <MaterialCommunityIcons
                name={user ? "account-circle" : "account-circle-outline"}
                size={22}
                color={COLOR_TEAL}
                style={{ marginRight: 6 }}
              />
              <Text numberOfLines={1} style={styles.headerUserText}>
                {headerDisplayName}
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Logo */}
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={[styles.logoImage, { width: 100, height: 30 }]}
                resizeMode="contain"
              />
            ) : (
              <Text
                style={{ color: "#008CBF", fontWeight: "bold", fontSize: 18 }}
              >
                NIKAIA!
              </Text>
            )}
          </View>
        )}
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          {/* header placeholder: nombre + logo */}
          <View style={styles.headerSkeletonRow}>
            <SkeletonLoader
              height={18}
              width={130}
              style={{ borderRadius: 6 }}
            />
            <View style={{ flex: 1 }} />
            <SkeletonLoader
              height={30}
              width={100}
              style={{ borderRadius: 6 }}
            />
          </View>
          {/* CTA card placeholder (horizontal: texto + imagen) */}
          <View style={styles.ctaSkeletonRow}>
            <View style={{ flex: 1.3, paddingRight: 10 }}>
              <SkeletonLoader
                height={18}
                width={"90%"}
                style={{ borderRadius: 6, marginBottom: 8 }}
              />
              <SkeletonLoader
                height={12}
                width={"100%"}
                style={{ borderRadius: 6, marginBottom: 6 }}
              />
              <SkeletonLoader
                height={12}
                width={"80%"}
                style={{ borderRadius: 6, marginBottom: 12 }}
              />
              <SkeletonLoader height={30} width={110} style={{ borderRadius: 16 }} />
            </View>
            <SkeletonLoader
              height={110}
              width={110}
              style={{ borderRadius: 14 }}
            />
          </View>
          {/* título placeholder */}
          <SkeletonLoader
            height={18}
            width={200}
            style={{ borderRadius: 6, marginTop: 18, marginBottom: 10 }}
          />
          {/* peek carousel placeholder */}
          <View style={{ flexDirection: "row" }}>
            <SkeletonLoader
              height={220}
              width={PEEK_CARD_WIDTH}
              style={{ borderRadius: 16, marginRight: 12 }}
            />
          </View>
          {/* category filter placeholder (6 elementos) */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: 24,
              marginBottom: 8,
              justifyContent: "center",
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ alignItems: "center", marginRight: 14, marginBottom: 10 }}>
                <SkeletonLoader height={54} width={54} borderRadius={999} />
                <SkeletonLoader
                  height={10}
                  width={40}
                  style={{ borderRadius: 6, marginTop: 6 }}
                />
              </View>
            ))}
          </View>
          {/* timeline placeholder */}
          <SkeletonLoader
            height={64}
            width={320}
            style={{ marginTop: 12, borderRadius: 12 }}
          />
          <SkeletonLoader
            height={64}
            width={320}
            style={{ marginTop: 10, borderRadius: 12 }}
          />
          {/* daily culture card placeholder */}
          <SkeletonLoader
            height={150}
            width={320}
            style={{ marginTop: 20, borderRadius: 18 }}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{
            paddingBottom: 32,
            paddingTop: headerHeight + sectionSpacing,
          }}
        >
          {/* Promotional Card / CTA Card (usa Promo_003) */}
          <View style={[styles.ctaCard, { marginTop: sectionSpacing }]}>
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaTitle} numberOfLines={2}>
                {promoTour?.Titulo ||
                  promoTour?.Nombre ||
                  "Vive una experiencia única"}
              </Text>
              <Text style={styles.ctaDesc} numberOfLines={3}>
                {promoTour?.Descripcion ||
                  "Descubre tours y paquetes pensados para ti."}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.ctaBtn}
                onPress={() => router.push("/promotions/Promo_003")}
              >
                <Text style={styles.ctaBtnText}>
                  {promoTour?.CTA || "Ver oferta"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ctaRight}>
              {promoTour?.ImagenURL ? (
                <Image
                  source={{ uri: promoTour.ImagenURL }}
                  style={styles.ctaImage}
                  resizeMode="cover"
                  onLoadEnd={() => setTourLoaded(true)}
                />
              ) : (
                <View style={[styles.ctaImage, styles.ctaImagePlaceholder]}>
                  <MaterialCommunityIcons
                    name="image-outline"
                    size={26}
                    color="#c7d0d6"
                  />
                </View>
              )}
              {promoTour?.ImagenURL && !tourLoaded && (
                <View style={styles.loaderMini}>
                  <ActivityIndicator size="small" color={COLOR_TEAL} />
                </View>
              )}
            </View>
          </View>

          {/* Título entre la CTA Card y el Carrusel */}
          <Text style={styles.betweenSectionTitle}>
            Descubre nuevos destinos
          </Text>

          {/* Snap / Peek Carousel horizontal (usa los valores originales del carrusel) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={PEEK_CARD_WIDTH + PEEK_CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.peekCarouselRow}
          >
            {carouselData.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.peekCard,
                  {
                    width: PEEK_CARD_WIDTH,
                    marginRight:
                      idx === carouselData.length - 1 ? 0 : PEEK_CARD_GAP,
                  },
                ]}
              >
                <View style={styles.peekImageWrap}>
                  <Image
                    source={item.image ? { uri: item.image } : undefined}
                    style={styles.peekImage}
                    resizeMode="cover"
                    onLoadEnd={() =>
                      setSlidesLoaded((prev) => {
                        const copy = [...prev];
                        copy[idx] = true;
                        return copy;
                      })
                    }
                  />
                  {item.image && !slidesLoaded[idx] && (
                    <View style={styles.loaderMini}>
                      <ActivityIndicator size="small" color={COLOR_TEAL} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.peekFavBtn}
                    activeOpacity={0.8}
                    onPress={() =>
                      setFavorites((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                  >
                    <MaterialCommunityIcons
                      name={favorites[idx] ? "heart" : "heart-outline"}
                      size={18}
                      color={favorites[idx] ? COLOR_ORANGE : "#fff"}
                    />
                  </TouchableOpacity>
                  {item.badge ? (
                    <View style={styles.peekBadge}>
                      <Text style={styles.peekBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.peekName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.peekInfo} numberOfLines={1}>
                  {item.desc}
                </Text>
                <View style={styles.peekFooterRow}>
                  {item.price ? (
                    <Text style={styles.peekPrice}>{item.price}</Text>
                  ) : (
                    <View />
                  )}
                  <TouchableOpacity style={styles.peekBtn} activeOpacity={0.85}>
                    <Text style={styles.peekBtnText}>
                      {item.btn || "Ver más"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Category Icon Selector / Category Filter Bar (6 elementos) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}
          >
            {CATEGORIAS.map((cat, idx) => {
              const active = selectedCategory === `${cat.slug}-${idx}`;
              return (
                <TouchableOpacity
                  key={`${cat.slug}-${idx}`}
                  style={styles.categoryItem}
                  activeOpacity={0.85}
                  accessibilityLabel={`Ir a ${cat.label}`}
                  onPress={() => {
                    setSelectedCategory(`${cat.slug}-${idx}`);
                    try {
                      router.push({ pathname: `/experiences/${cat.slug}` });
                    } catch (e) {
                      router.push(`/experiences/${cat.slug}`);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.categoryCircle,
                      { backgroundColor: cat.color },
                      active && styles.categoryCircleActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon}
                      size={26}
                      color="#D96E32"
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      active && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  <View
                    style={[
                      styles.categoryIndicator,
                      active && styles.categoryIndicatorActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Timeline Event Card: itinerario del día */}
          <View style={styles.timelineSection}>
            <Text style={styles.betweenSectionTitle}>Tu itinerario de hoy</Text>
            <View style={styles.timelineList}>
              {TIMELINE_EVENTS.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  activeOpacity={0.85}
                  style={styles.timelineCard}
                >
                  <View
                    style={[
                      styles.timelineIndicator,
                      { backgroundColor: ev.color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineTime}>
                      {ev.allDay ? "Todo el día" : ev.time}
                    </Text>
                    <Text style={styles.timelineTitle} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Text style={styles.timelineSubtitle} numberOfLines={1}>
                      {ev.subtitle}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color="#aaa"
                  />
                </TouchableOpacity>
              ))}
              <View style={styles.timelineTrack} />
            </View>
          </View>

          {/* Daily Cultural Activity Card */}
          <View style={styles.cultureCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cultureLabel}>Cultura del día</Text>
              <Text style={styles.cultureTitle}>Conoce el Palo de Mayo</Text>
              <Text style={styles.cultureDesc}>
                Descubre la historia, música y tradiciones de esta celebración
                cultural de la Costa Caribe de Nicaragua.
              </Text>
              <View style={styles.cultureBtnRow}>
                <TouchableOpacity
                  style={styles.cultureBtnPrimary}
                  activeOpacity={0.85}
                  onPress={() => router.push("/experiences/tradiciones")}
                >
                  <Text style={styles.cultureBtnPrimaryText}>
                    Comenzar experiencia
                  </Text>
                  <MaterialCommunityIcons
                    name="play"
                    size={14}
                    color="#fff"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cultureBtnSecondary}
                  activeOpacity={0.7}
                  onPress={() => router.push("/experiences/tradiciones")}
                >
                  <Text style={styles.cultureBtnSecondaryText}>Ver más</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cultureVisual}>
              <MaterialCommunityIcons
                name="ticket-outline"
                size={40}
                color="#D96E32"
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fafd",
    paddingTop: 24,
  },
  logoImage: {
    width: 180,
    height: 48,
    marginBottom: 0,
  },

  // Header Styles
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    alignItems: "center",
    zIndex: 10,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 12,
  },
  headerSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 12,
  },
  headerUserWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
  },
  headerUserText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0000",
    fontFamily: "Montserrat-Regular",
  },

  // Promotional / CTA Card
  ctaCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginHorizontal: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d96e32",
    elevation: 2,
    shadowColor: "#d96e32",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  ctaLeft: {
    flex: 1,
    paddingRight: 12,
  },
  ctaTitle: {
    fontSize: 19,
    fontWeight: "regular",
    color: "#0000",
    fontFamily: "Montserrat-Bold",
    marginBottom: 6,
  },
  ctaDesc: {
    fontSize: 12.5,
    color: "#0000",
    fontFamily: "Montserrat-Regular",
    marginBottom: 12,
    lineHeight: 17,
  },
  ctaBtn: {
    backgroundColor: COLOR_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  ctaBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12.5,
    fontFamily: "Montserrat-Bold",
  },
  ctaRight: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaImage: {
    width: "110%",
    height: "110%",
    borderRadius: 10,
  },
  ctaImagePlaceholder: {
    backgroundColor: "#d96e32",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 14,
    marginTop: 12,
  },

  // Título entre secciones
  betweenSectionTitle: {
    fontSize: 19,
    fontWeight: "Regular",
    color: "#222",
    fontFamily: "Montserrat-Bold",
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 16,
  },

  // Peek / Snap Carousel
  peekCarouselRow: {
    paddingHorizontal: 14,
  },
  peekCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d96e32",
    elevation: 2,
    shadowColor: "#d96e32",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  peekImageWrap: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#d96e32",
  },
  peekImage: {
    width: "100%",
    height: "100%",
  },
  peekFavBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  peekBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLOR_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  peekBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
  },
  peekName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    fontFamily: "Montserrat-Bold",
    marginTop: 8,
  },
  peekInfo: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Montserrat-Regular",
    marginTop: 2,
  },
  peekFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  peekPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLOR_ORANGE,
    fontFamily: "Montserrat-Bold",
  },
  peekBtn: {
    backgroundColor: COLOR_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  peekBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11.5,
    fontFamily: "Montserrat-Bold",
  },

  // Category Filter Bar
  categoryFilterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 8,
  },
  
  categoryItem: {
    alignItems: "center",
    marginRight: 20,
    width: 66,
  },
  
  categoryCircle: {
    width: 54,
    height: 54,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLOR_ORANGE,
  },
  
  categoryCircleActive: {
    borderWidth: 3,
    borderColor: COLOR_ORANGE,
    backgroundColor: "#FFFFFF",
  },
  
  categoryLabel: {
    fontSize: 9,
    color: "#000",
    textAlign: "center",
    fontFamily: "Montserrat-Regular",
  },
  
  categoryLabelActive: {
    color: COLOR_ORANGE,
    fontFamily: "Montserrat-Bold",
  },
  
  categoryIndicator: {
    height: 2,
    width: 22,
    borderRadius: 0.5,
    marginTop: 2,
    backgroundColor: "#d96e32",
  },
  
  categoryIndicatorActive: {
    backgroundColor: COLOR_ORANGE,
  },

  // Timeline Event Card
  timelineSection: {
    marginTop: 1,
  },
  timelineList: {
    paddingHorizontal: 16,
    position: "relative",
  },
  timelineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D96E32",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  timelineIndicator: {
    width: 5,
    height: 38,
    borderRadius: 3,
    marginRight: 12,
  },
  timelineTime: {
    fontSize: 11.5,
    color: COLOR_TEAL,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#222",
    fontFamily: "Montserrat-Bold",
  },
  timelineSubtitle: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Montserrat-Regular",
    marginTop: 1,
  },
  timelineTrack: {
    position: "absolute",
    left: 24,
    top: 8,
    bottom: 20,
    width: 2,
    backgroundColor: "#D96E32",
    zIndex: -1,
  },

  loaderMini: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D96E32",
  },

  // Daily Cultural Activity Card
  cultureCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderColor: COLOR_ORANGE,
    borderWidth: 2,
    marginHorizontal: 15,
    marginTop: 5,      // La sube un poco
    marginBottom: 110,  // Espacio blanco debajo
    padding: 16,
    alignItems: "center",
  },

  cultureLabel: {
    fontSize: 17,
    color: COLOR_ORANGE,
    fontWeight: "700",
    fontFamily: "Montserrat-Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  
  cultureTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
    fontFamily: "Montserrat-Bold",
    marginBottom: 6,
  },
  
  cultureDesc: {
    fontSize: 12.5,
    color: "#000",
    fontFamily: "Montserrat-Regular",
    lineHeight: 17,
    marginBottom: 14,
  },
  
  cultureBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  cultureBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLOR_ORANGE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  
  cultureBtnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
  },
  
  cultureBtnSecondary: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  
  cultureBtnSecondaryText: {
    color: "#9fd8cc",
    fontWeight: "700",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    textDecorationLine: "underline",
  },
  
  cultureVisual: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    borderColor: COLOR_TEAL,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});