import React from 'react'
import { StyleSheet, Text, ViewStyle, View } from 'react-native'
import MaskInput from 'react-native-mask-input'

// Define a interface para as propriedades do componente
interface CnpjInputProps {
  value: string
  onChangeText: (masked: string, unmasked: string) => void
  style?: ViewStyle
}

const CnpjInput: React.FC<CnpjInputProps> = ({ value, onChangeText, style }) => {
  // A máscara do CNPJ é um array de RegExp e strings
  const cnpjMask = [
    /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '/',
    /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/,
  ]

  return (
    <View style={style}>
      <MaskInput
        mask={cnpjMask}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="CNPJ* Ex.: 00.000.000/0000-00"
        style={styles.input}
        placeholderTextColor='#666'
      />
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#333',
  },
})

export default CnpjInput