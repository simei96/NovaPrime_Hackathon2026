//Importaciones
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLOR_TEAL } from '../../constants/colors';

//Descripcion
export default function ExpandableText({ text, maxWords = 50, style }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const words = text.trim().split(/\s+/);
  const isLong = words.length > maxWords;
  const shortText = isLong ? `${words.slice(0, maxWords).join(' ')}…` : text;

  return (
    <View>
      <Text style={style}>{expanded || !isLong ? text : shortText}</Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
          <Text style={{ color: COLOR_TEAL, fontWeight: '700', marginTop: 4, fontSize: 12.5 }}>
            {expanded ? 'Mostrar menos' : 'Mostrar más'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}