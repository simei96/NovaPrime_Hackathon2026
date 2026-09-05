import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

// Componentes
import CategorySelector from "../../../components/home/CategorySelector";
import CultureOfTheDay from "../../../components/home/CultureOfTheDay";
import DestinationCarousel from "../../../components/home/DestinationCarousel";
import HomeHeader from "../../../components/home/HomeHeader";
import HomeSkeleton from "../../../components/home/HomeSkeleton";
import ItinerarySection from "../../../components/home/ItinerarySection";
import PromotionalCard from "../../../components/home/PromotionalCard";
import SectionHeader from "../../../components/home/SectionHeader";

// Hooks
import { useFavorites } from "../../../hooks/useFavorites";
import { useHomeData } from "../../../hooks/useHomeData";
import { useUserProfile } from "../../../hooks/useUserProfile";

export default function Home() {
  const router = useRouter();

  const {
    user,
    avatarURL,
    logoURL,
    logoHeaderId,
    loadingLogo,
    displayName,
  } = useUserProfile();

  const {
    promotion,
    featuredCards,
    categories,
    itinerary,
    cultureOfTheDay,
    loading,
  } = useHomeData(user);

  const { favoritesMap, toggleFavorite } = useFavorites(user);

  // Categoría activa (resaltada) del selector
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  function goToProfileOrLogin() {
    router.push(user ? "/screens/home/Perfil" : "/login");
  }

  function handleCategoryPress(categoria) {
    setSelectedCategoryId(categoria.id);

    // Prioriza "ruta" (Firestore o fallback); si faltara, la arma desde "slug".
    const destino = categoria.ruta || (categoria.slug ? `/services/${categoria.slug}` : null);

    if (destino) {
      router.push(destino);
    } else {
      console.warn("Categoría sin ruta configurada:", categoria.nombre);
    }
  }

  function handlePressPromotion() {
    if (promotion?.id) {
      router.push(`/promotions/${promotion.id}`);
    }
  }

  function handlePressContentItem(item) {
    router.push(`/details/${item.type}/${item.id}`);
  }

  function handleToggleFavorite(item) {
    toggleFavorite(item, { onRequireLogin: () => router.push("/login") });
  }

  return (
    <View style={{ flex: 1 }}>
      <HomeHeader
        loading={loadingLogo}
        user={user}
        displayName={displayName}
        avatarURL={avatarURL}
        logoURL={logoURL}
        logoHeaderId={logoHeaderId}
        onPressUser={goToProfileOrLogin}
      />

      {loading ? (
        <HomeSkeleton />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 100 }}
        >
          <PromotionalCard promotion={promotion} onPress={handlePressPromotion} />

          <SectionHeader title="Descubre nuevos destinos" />

          <DestinationCarousel
            items={featuredCards}
            favoritesMap={favoritesMap}
            onPressItem={handlePressContentItem}
            onToggleFavorite={handleToggleFavorite}
          />

          <CategorySelector
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleCategoryPress}
          />

          <ItinerarySection events={itinerary} onPressEvent={handlePressContentItem} />

          <CultureOfTheDay
            content={cultureOfTheDay}
            onPressPrimary={() => router.push("/experiences/tradiciones")}
            onPressSecondary={() => router.push("/experiences/tradiciones")}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fafd",
  },
});