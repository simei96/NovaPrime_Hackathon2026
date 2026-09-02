//importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

// paleta de colores
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';
const COLOR_TEAL_SOFT = 'rgba(46,173,154,0.12)';
const COLOR_TEXT_DARK = '#263238';
const COLOR_TEXT_MUTED = '#607d8b';

// Category Chips
const CATEGORIAS_CHIPS = [
	{ label: 'Todos', icon: 'view-grid-outline' },
	{ label: 'Volcanes', icon: 'image-filter-hdr' },
	{ label: 'Islas', icon: 'island' },
	{ label: 'Cañones', icon: 'terrain' },
	{ label: 'Lagunas', icon: 'water' },
	{ label: 'Reservas', icon: 'pine-tree' },
];

// CTA Card tipo carrusel (ofertas) — estático por ahora
const OFERTAS = [
	{
		id: 'n-off-1',
		titulo: 'Tour Volcán + Laguna',
		desc: 'Cráter Masaya + Laguna de Apoyo en un día',
		descuento: 15,
		precioNuevo: 680,
		precioAnterior: 800,
		imagen: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?auto=format&fit=crop&w=900&q=80',
	},
	{
		id: 'n-off-2',
		titulo: 'Aventura en Somoto',
		desc: 'Tour en balsa + almuerzo incluido',
		descuento: 20,
		precioNuevo: 480,
		precioAnterior: 600,
		imagen: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=900&q=80',
	},
];

function normalizeLugar(d) {
	const data = d.data() || {};
	return {
		id: d.id,
		nombre: data.Nombre || 'Sin nombre',
		categoria: data.Categoria || 'Otro',
		ubicacion: data.Ubicacion || '',
		imagen: data.ImagenURL || null,
		rating: typeof data.Rating === 'number' ? data.Rating : 0,
		precio: typeof data.Precio === 'number' ? data.Precio : null,
		descripcion: data.Descripcion || '',
		horario: data.Horario || '',
		disponible: data.Disponible !== undefined ? !!data.Disponible : true,
		actividades: Array.isArray(data.Actividades) ? data.Actividades : [],
	};
}

export default function NaturalezaScreen() {
	const router = useRouter();
	const [activeFilter, setActiveFilter] = useState('Todos');
	const [search, setSearch] = useState('');
	const [carouselIndex, setCarouselIndex] = useState(0);

	const [lugares, setLugares] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [refreshing, setRefreshing] = useState(false);
	const [favorites, setFavorites] = useState({});
	const scrollRef = useRef(null);

	useEffect(() => {
		const colRef = collection(db, 'Naturaleza');
		const unsub = onSnapshot(
			colRef,
			(snap) => {
				setLugares(snap.docs.map(normalizeLugar));
				setLoading(false);
			},
			(err) => {
				setError(err.message);
				setLoading(false);
			}
		);
		return () => unsub();
	}, []);

	useEffect(() => {
		const it = setInterval(() => setCarouselIndex((p) => (p + 1) % OFERTAS.length), 3800);
		return () => clearInterval(it);
	}, []);
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTo({ x: carouselIndex * 300, animated: true });
		}
	}, [carouselIndex]);

	// onSnapshot ya mantiene los datos al día en tiempo real; el pull-to-refresh
	// solo da la sensación de actualización manual al usuario.
	const onRefresh = useCallback(() => {
		setRefreshing(true);
		setTimeout(() => setRefreshing(false), 700);
	}, []);

	const toggleFavorite = (id) => {
		setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const resetFiltros = () => {
		setActiveFilter('Todos');
		setSearch('');
	};

	const filtrados = lugares.filter((l) => (
		(activeFilter === 'Todos' || l.categoria === activeFilter) &&
		l.nombre.toLowerCase().includes(search.toLowerCase())
	));

	const destacados = lugares.slice(0, 5);
	const filtroActivo = activeFilter !== 'Todos' || search.trim().length > 0;

	// render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<View style={styles.emptyIconCircle}>
				<MaterialCommunityIcons name="image-filter-hdr" size={38} color={COLOR_TEAL} />
			</View>
			<Text style={styles.emptyTitle}>Todavía no hay nada aquí</Text>
			<Text style={styles.emptySubtitle}>Hay tanto por descubrir de nuestra naturaleza</Text>
			<TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={resetFiltros}>
				<MaterialCommunityIcons name="magnify" size={16} color="#fff" style={{ marginRight: 6 }} />
				<Text style={styles.emptyBtnText}>Ir a explorar</Text>
			</TouchableOpacity>
		</View>
	);

	const renderAllCard = (item) => (
		<View key={item.id} style={styles.allCard}>
			<View style={styles.allImageWrap}>
				{item.imagen ? (
					<Image source={{ uri: item.imagen }} style={styles.allImage} resizeMode="cover" />
				) : (
					<View style={[styles.allImage, styles.resultImagePlaceholder]}>
						<MaterialCommunityIcons name="image-outline" size={26} color="#c7d0d6" />
					</View>
				)}
				<TouchableOpacity
					style={styles.allFavBtn}
					activeOpacity={0.8}
					onPress={() => toggleFavorite(item.id)}
				>
					<MaterialCommunityIcons
						name={favorites[item.id] ? 'heart' : 'heart-outline'}
						size={18}
						color={favorites[item.id] ? COLOR_ORANGE : '#fff'}
					/>
				</TouchableOpacity>
			</View>

			<View style={styles.allBody}>
				<Text style={styles.allName} numberOfLines={1}>
					{item.nombre}
				</Text>
				<View style={styles.allInfoRow}>
					<Text style={styles.allCategory} numberOfLines={1}>
						{item.categoria}
					</Text>
					<View style={styles.allRatingRow}>
						<MaterialCommunityIcons name="star" size={14} color={COLOR_OLIVE} />
						<Text style={styles.allRatingText}>{item.rating}</Text>
					</View>
				</View>
				<TouchableOpacity
					style={styles.allBtn}
					activeOpacity={0.85}
					onPress={() => router.push(`/services/naturaleza/${item.id}`)}
				>
					<Text style={styles.allBtnText}>Ver detalles</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	//Tarjeta de resultados
	const renderResultCard = ({ item }) => (
		<View key={item.id} style={styles.resultCard}>
			<View style={styles.resultImageWrap}>
				{item.imagen ? (
					<Image source={{ uri: item.imagen }} style={styles.resultImage} resizeMode="cover" />
				) : (
					<View style={[styles.resultImage, styles.resultImagePlaceholder]}>
						<MaterialCommunityIcons name="image-outline" size={22} color="#c7d0d6" />
					</View>
				)}
				<TouchableOpacity
					style={styles.favBtn}
					activeOpacity={0.8}
					onPress={() => toggleFavorite(item.id)}
				>
					<MaterialCommunityIcons
						name={favorites[item.id] ? 'heart' : 'heart-outline'}
						size={16}
						color={favorites[item.id] ? COLOR_ORANGE : '#fff'}
					/>
				</TouchableOpacity>
			</View>

			<View style={styles.resultBody}>
				<Text style={styles.resultName} numberOfLines={1}>
					{item.nombre}
				</Text>
				<View style={styles.resultInfoRow}>
					<Text style={styles.resultType} numberOfLines={1}>
						{item.ubicacion || 'Sin ubicación'}
					</Text>
					<Text style={styles.resultPrice} numberOfLines={1}>
						{item.precio != null && item.precio > 0 ? `C$ ${item.precio}` : 'Entrada libre'}
					</Text>
				</View>
				<TouchableOpacity
					style={styles.resultBtn}
					activeOpacity={0.85}
					onPress={() => router.push(`/services/naturaleza/${item.id}`)}
				>
					<Text style={styles.resultBtnText}>Ver detalles</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View style={{ flex: 1, backgroundColor: '#f6fafd' }}>
			<Stack.Screen options={{ title: 'Naturaleza', headerTitleAlign: 'center' }} />
			<ScrollView
				contentContainerStyle={{ paddingBottom: 40 }}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLOR_TEAL]} tintColor={COLOR_TEAL} />}
			>
				{/* Header / App Bar */}
				<View style={styles.hero}>
					<View style={styles.decoCircleTop} />
					<View style={styles.decoCircleBottom} />
					<MaterialCommunityIcons
						name="image-filter-hdr"
						size={70}
						color="rgba(255,255,255,0.08)"
						style={styles.decoIcon}
					/>

					<Text style={styles.heroTitle}>Naturaleza</Text>
					<Text style={styles.heroSubtitle}>Volcanes, islas y reservas · Precios en córdobas</Text>

					<View style={styles.searchRow}>
						<View style={styles.searchBox}>
							<TextInput
								style={styles.searchInput}
								placeholder="Buscar lugares..."
								placeholderTextColor="rgba(255,255,255,0.65)"
								value={search}
								onChangeText={setSearch}
							/>
						</View>
						<TouchableOpacity style={styles.searchBtn} activeOpacity={0.85}>
							<MaterialCommunityIcons name="magnify" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				</View>

				{/* Categories Section */}
				<View style={styles.filtrosWrap}>
					<Text style={styles.filtrosTitle}>Categorías</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosRow}>
						{CATEGORIAS_CHIPS.map((cat) => {
							const active = activeFilter === cat.label;
							return (
								<TouchableOpacity
									key={cat.label}
									onPress={() => setActiveFilter(cat.label)}
									style={[styles.chip, active && styles.chipActive]}
									activeOpacity={0.85}
								>
									<MaterialCommunityIcons
										name={cat.icon}
										size={16}
										color={active ? '#fff' : COLOR_TEAL}
										style={{ marginRight: 6 }}
									/>
									<Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>

				{/* Estado de carga */}
				{loading && (
					<View style={styles.loadingRow}>
						<ActivityIndicator size="small" color={COLOR_TEAL} />
						<Text style={styles.loadingText}>Cargando lugares...</Text>
					</View>
				)}

				{/* Error */}
				{!loading && error && (
					<View style={styles.emptyState}>
						<View style={styles.emptyIconCircle}>
							<MaterialCommunityIcons name="wifi-off" size={34} color={COLOR_ORANGE} />
						</View>
						<Text style={styles.emptyTitle}>No se pudo cargar</Text>
						<Text style={styles.emptySubtitle}>{error}</Text>
					</View>
				)}

				{!loading && !error && !filtroActivo && (
					<>
						{/* CTA Card tipo carrusel (Ofertas) */}
						<View style={{ marginTop: 22 }}>
							<View style={styles.sectionHeaderRow}>
								<MaterialCommunityIcons name="gift" size={18} color={COLOR_TEAL} style={{ marginRight: 6 }} />
								<Text style={styles.sectionTitle}>Ofertas</Text>
							</View>
							<ScrollView
								ref={scrollRef}
								horizontal
								pagingEnabled
								showsHorizontalScrollIndicator={false}
								snapToInterval={300}
								decelerationRate="fast"
								contentContainerStyle={{ paddingHorizontal: 16 }}
							>
								{OFERTAS.map((o, idx) => (
									<View key={o.id} style={[styles.offerCard, { marginRight: idx === OFERTAS.length - 1 ? 0 : 14 }]}>
										<Image source={{ uri: o.imagen }} style={styles.offerImage} resizeMode="cover" />
										<View style={styles.offerOverlay} />
										<View style={styles.badgeDescuento}>
											<Text style={styles.badgeDescuentoText}>{o.descuento}% OFF</Text>
										</View>
										<View style={styles.offerContent}>
											<Text style={styles.offerTitle}>{o.titulo}</Text>
											<Text style={styles.offerDesc} numberOfLines={2}>{o.desc}</Text>
											<View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
												<Text style={styles.ofertaPrecioNuevo}>C$ {o.precioNuevo}</Text>
												<Text style={styles.ofertaPrecioAnterior}>C$ {o.precioAnterior}</Text>
											</View>
											<TouchableOpacity style={styles.offerBtn} activeOpacity={0.85}>
												<Text style={styles.offerBtnText}>Aprovechar</Text>
											</TouchableOpacity>
										</View>
									</View>
								))}
							</ScrollView>
							<View style={styles.dotsRow}>
								{OFERTAS.map((_, i) => (
									<View key={i} style={[styles.dot, i === carouselIndex && styles.dotActive]} />
								))}
							</View>
						</View>

						{/* Peek / Snap Carousel (Destacados) — datos reales de Firestore */}
						<View style={{ marginTop: 26 }}>
							<View style={styles.sectionHeaderRow}>
								<MaterialCommunityIcons name="star-outline" size={18} color={COLOR_TEAL} style={{ marginRight: 6 }} />
								<Text style={styles.sectionTitle}>Destacados</Text>
							</View>
							{destacados.length === 0 ? (
								<Text style={[styles.loadingText, { paddingHorizontal: 16 }]}>
									Aún no hay lugares registrados.
								</Text>
							) : (
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={{ paddingHorizontal: 16 }}
								>
									{destacados.map((d, idx) => (
										<View
											key={d.id}
											style={[styles.peekCard, { marginRight: idx === destacados.length - 1 ? 0 : 14 }]}
										>
											<View style={styles.peekImageWrap}>
												{d.imagen ? (
													<Image source={{ uri: d.imagen }} style={styles.peekImage} resizeMode="cover" />
												) : (
													<View style={[styles.peekImage, styles.resultImagePlaceholder]}>
														<MaterialCommunityIcons name="image-outline" size={22} color="#c7d0d6" />
													</View>
												)}
												<TouchableOpacity
													style={styles.peekFavBtn}
													activeOpacity={0.8}
													onPress={() => toggleFavorite(d.id)}
												>
													<MaterialCommunityIcons
														name={favorites[d.id] ? 'heart' : 'heart-outline'}
														size={18}
														color={favorites[d.id] ? COLOR_ORANGE : '#fff'}
													/>
												</TouchableOpacity>
											</View>
											<Text style={styles.peekName} numberOfLines={1}>{d.nombre}</Text>
											<Text style={styles.peekInfo} numberOfLines={1}>
												{d.ubicacion}{d.horario ? ` • ${d.horario}` : ''}
											</Text>
											<View style={styles.peekFooterRow}>
												<Text style={styles.peekPrice}>
													{d.precio != null && d.precio > 0 ? `C$ ${d.precio}` : 'Entrada libre'}
												</Text>
												<TouchableOpacity
													style={styles.peekBtn}
													activeOpacity={0.85}
													onPress={() => router.push(`/services/naturaleza/${d.id}`)}
												>
													<Text style={styles.peekBtnText}>Ver más</Text>
												</TouchableOpacity>
											</View>
										</View>
									))}
								</ScrollView>
							)}
						</View>

						{/* Todos los lugares — grid con todos los documentos de Firestore */}
						<View style={{ marginTop: 26, paddingHorizontal: 16 }}>
							<View style={[styles.sectionHeaderRow, { paddingHorizontal: 0 }]}>
								<MaterialCommunityIcons name="view-grid-outline" size={18} color={COLOR_TEAL} style={{ marginRight: 6 }} />
								<Text style={styles.sectionTitle}>Todos los lugares</Text>
							</View>

							{lugares.length === 0 ? (
								renderEmptyState()
							) : (
								<View style={styles.allGrid}>
									{lugares.map((item) => renderAllCard(item))}
								</View>
							)}
						</View>
					</>
				)}

				{/* Results Listing Component */}
				{!loading && !error && filtroActivo && (
					<View style={{ marginTop: 22, paddingHorizontal: 16 }}>
						<Text style={styles.sectionTitle}>Resultados ({filtrados.length})</Text>
						{filtrados.length === 0 ? (
							renderEmptyState()
						) : (
							<FlatList
								data={filtrados}
								keyExtractor={(item) => item.id}
								renderItem={renderResultCard}
								numColumns={2}
								scrollEnabled={false}
								columnWrapperStyle={{ justifyContent: 'space-between' }}
								contentContainerStyle={{ marginTop: 12 }}
								ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
							/>
						)}
					</View>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	// Header / App Bar
	hero: {
		backgroundColor: COLOR_TEAL,
		paddingTop: 45,
		paddingBottom: 20,
		paddingHorizontal: 10,
		overflow: 'hidden',
		position: 'relative',
	},
	decoCircleTop: {
		position: 'absolute',
		top: -30,
		right: -20,
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: COLOR_ORANGE,
		opacity: 0.45,
	},
	decoCircleBottom: {
		position: 'absolute',
		bottom: -40,
		left: -30,
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: COLOR_ORANGE,
		opacity: 0.3,
	},
	decoIcon: {
		position: 'absolute',
		top: 10,
		left: -10,
	},
	heroTitle: {
		color: '#fff',
		fontSize: 30,
		fontFamily: 'Montserrat-Bold',
		textAlign: 'center',
		marginBottom: 6,
	},
	heroSubtitle: {
		color: '#e3f5f1',
		fontSize: 10,
		fontFamily: 'Montserrat-Medium',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 20,
	},

	searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	searchBox: {
		flex: 1,
		backgroundColor: 'rgba(255,255,255,0.15)',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.35)',
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	searchInput: { color: '#fff', fontSize: 14, fontFamily: 'Montserrat-Medium', padding: 0 },
	searchBtn: {
		width: 42,
		height: 42,
		borderRadius: 10,
		backgroundColor: COLOR_ORANGE,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},

	// Categories filter
	filtrosWrap: {
		backgroundColor: '#fff',
		marginTop: 0,
		paddingTop: 14,
		paddingBottom: 14,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#e0e3ea',
	},
	filtrosTitle: {
		fontSize: 14,
		fontFamily: 'Montserrat-SemiBold',
		color: '#37474f',
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	filtrosRow: { paddingHorizontal: 16, paddingRight: 24, gap: 8 },
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f1f5f8',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
	},
	chipActive: { backgroundColor: COLOR_TEAL },
	chipText: { fontSize: 13, fontFamily: 'Montserrat-Medium', color: COLOR_TEXT_DARK },
	chipTextActive: { color: '#fff', fontFamily: 'Montserrat-SemiBold' },

	// Sección genérica
	sectionTitle: { fontSize: 15, fontFamily: 'Montserrat-SemiBold', color: COLOR_TEXT_DARK },
	sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },

	// CTA Card carrusel (ofertas) — imagen + overlay
	offerCard: {
		width: 300,
		height: 190,
		borderRadius: 8,
		overflow: 'hidden',
		position: 'relative',
		backgroundColor: '#eceff1',
	},
	offerImage: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100%',
		height: '100%',
	},
	offerOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.45)',
	},
	offerContent: {
		flex: 1,
		padding: 16,
		justifyContent: 'flex-end',
	},
	offerTitle: {
		fontSize: 16,
		fontFamily: 'Montserrat-Bold',
		color: '#fff',
	},
	offerDesc: {
		fontSize: 12,
		fontFamily: 'Montserrat-Regular',
		color: '#f1f5f8',
		marginTop: 4,
	},
	ofertaPrecioNuevo: {
		fontSize: 16,
		fontFamily: 'Montserrat-Bold',
		color: '#fff',
	},
	ofertaPrecioAnterior: {
		fontSize: 12,
		fontFamily: 'Montserrat-Regular',
		color: '#e0e3ea',
		textDecorationLine: 'line-through',
		marginLeft: 8,
		marginBottom: 2,
	},
	badgeDescuento: {
		position: 'absolute',
		top: 12,
		right: 12,
		backgroundColor: COLOR_ORANGE,
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	badgeDescuentoText: {
		color: '#fff',
		fontSize: 11,
		fontFamily: 'Montserrat-Bold',
	},
	offerBtn: {
		marginTop: 10,
		alignSelf: 'flex-start',
		backgroundColor: COLOR_TEAL,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	offerBtnText: {
		color: '#fff',
		fontSize: 12,
		fontFamily: 'Montserrat-Bold',
	},
	dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
	dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cfd8dc', opacity: 0.6 },
	dotActive: { backgroundColor: COLOR_TEAL, opacity: 1, width: 16 },

	// Peek / Snap Carousel (destacados)
	peekCard: { width: 240, backgroundColor: '#fff', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: COLOR_ORANGE },
	peekImageWrap: { width: '100%', height: 130, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eceff1', position: 'relative' },
	peekImage: { width: '100%', height: '100%' },
	peekFavBtn: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	peekName: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: COLOR_TEXT_DARK, marginTop: 8 },
	peekInfo: { fontSize: 11.5, fontFamily: 'Montserrat-Regular', color: COLOR_TEXT_MUTED, marginTop: 2 },
	peekFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
	peekPrice: { fontSize: 13, fontFamily: 'Montserrat-Bold', color: COLOR_TEAL },
	peekBtn: { backgroundColor: COLOR_TEAL, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
	peekBtnText: { color: '#fff', fontWeight: '700', fontSize: 11, fontFamily: 'Montserrat-Bold' },

	// Todos los lugares (grid: borde teal, categoría + rating, botón ancho)
	allGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
	allCard: {
		width: '48%',
		backgroundColor: '#fff',
		borderRadius: 16,
		overflow: 'hidden',
		borderWidth: 1.5,
		borderColor: COLOR_TEAL,
		marginBottom: 16,
		elevation: 1,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},
	allImageWrap: { width: '100%', height: 130, position: 'relative', backgroundColor: '#eceff1' },
	allImage: { width: '100%', height: '100%' },
	allFavBtn: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	allBody: { padding: 12 },
	allName: { fontSize: 15, fontFamily: 'Montserrat-Bold', color: COLOR_TEXT_DARK },
	allInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
	allCategory: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: COLOR_TEAL },
	allRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
	allRatingText: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: COLOR_TEXT_DARK },
	allBtn: {
		marginTop: 10,
		alignSelf: 'stretch',
		alignItems: 'center',
		backgroundColor: COLOR_TEAL,
		borderRadius: 20,
		paddingVertical: 10,
	},
	allBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Montserrat-Bold' },

	// Results Listing (grid tipo card, cuando hay filtro/búsqueda activa)
	resultCard: {
		width: '48%',
		backgroundColor: '#fff',
		borderRadius: 14,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: COLOR_ORANGE,
		elevation: 1,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},
	resultImageWrap: { width: '100%', height: 110, position: 'relative', backgroundColor: '#eceff1' },
	resultImage: { width: '100%', height: '100%' },
	resultImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
	favBtn: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	resultBody: { padding: 10 },
	resultName: { fontSize: 13.5, fontFamily: 'Montserrat-Bold', color: COLOR_TEXT_DARK },
	resultInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
	resultType: { flex: 1, marginRight: 6, fontSize: 11, fontFamily: 'Montserrat-Regular', color: COLOR_TEXT_MUTED },
	resultPrice: { fontSize: 13, fontFamily: 'Montserrat-Bold', color: COLOR_TEAL },
	resultBtn: {
		marginTop: 8,
		alignSelf: 'stretch',
		alignItems: 'center',
		backgroundColor: COLOR_TEAL_SOFT,
		borderRadius: 10,
		paddingVertical: 8,
	},
	resultBtnText: { color: COLOR_TEAL, fontSize: 12, fontFamily: 'Montserrat-Bold' },

	// Estado de carga
	loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
	loadingText: { fontSize: 13, fontFamily: 'Montserrat-Regular', color: COLOR_TEXT_MUTED },

	// Empty State
	emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
	emptyIconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: COLOR_TEAL_SOFT,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	emptyTitle: {
		fontSize: 16,
		fontFamily: 'Montserrat-Bold',
		color: COLOR_TEXT_DARK,
		textAlign: 'center',
		marginBottom: 6,
		textTransform: 'uppercase',
	},
	emptySubtitle: {
		fontSize: 13,
		fontFamily: 'Montserrat-Regular',
		color: COLOR_TEXT_MUTED,
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: 18,
	},
	emptyBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLOR_TEAL,
		borderRadius: 20,
		paddingHorizontal: 18,
		paddingVertical: 10,
	},
	emptyBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Montserrat-Bold' },
});