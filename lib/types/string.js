const { isType } = require('../util')

module.exports = function string(length, encoding = 'ascii') {
  if (!Buffer.isEncoding(encoding)) {
    throw new Error('Argument #2 should be an encoding name.')
  }

  if (typeof length === 'number') {
    return {
      encode: encodeFixedString(length, encoding),
      decode: decodeFixedString(length, encoding),
    }
  } else if (isType(length)) {
    return {
      encode: encodeSizePrefixedString(length, encoding),
      decode: decodeSizePrefixedString(length, encoding),
    }
  } else if (Object.is(length, null)) {
    return {
      encode: encodeNullString(encoding),
      decode: decodeNullString(encoding),
    }
  } else {
    throw new TypeError('Unknown type of argument #1.')
  }
}

function encodeNullString(encoding) {
  return function encode(value, wstream) {
    const buf = Buffer.from(value.toString(), encoding)

    wstream.writeBuffer(buf)
    wstream.writeInt8(0)

    encode.bytes = buf.length + 1
  }
}

function decodeNullString(encoding) {
  return function decode(rstream) {
    let bytes = 0

    while (rstream.get(bytes) !== 0) {
      ++bytes

      if (bytes >= rstream.length) {
        throw new RangeError('Out of bounds.')
      }
    }

    const buf = rstream.readBuffer(bytes + 1)
    decode.bytes = buf.length

    return buf.toString(encoding, 0, bytes)
  }
}

function encodeFixedString(size, encoding) {
  return function encode(value, wstream) {
    value = value.toString()

    if (Buffer.byteLength(value, encoding) !== size) {
      throw new Error(`Size of string should be ${size} in bytes.`)
    }

    const buf = Buffer.from(value.toString(), encoding)

    wstream.writeBuffer(buf)
    encode.bytes = buf.length
  }
}

function decodeFixedString(size, encoding) {
  return function decode(rstream) {
    const buf = rstream.readBuffer(size)
    decode.bytes = buf.length

    return buf.toString(encoding)
  }
}

function encodeSizePrefixedString(type, encoding) {
  return function encode(value, wstream) {
    value = value.toString()

    type.encode(Buffer.byteLength(value, encoding), wstream)
    encode.bytes = type.encode.bytes

    const buf = Buffer.from(value, encoding)

    wstream.writeBuffer(buf)
    encode.bytes += buf.length
  }
}

function decodeSizePrefixedString(type, encoding) {
  return function decode(rstream) {
    const size = type.decode(rstream)
    decode.bytes = type.decode.bytes

    if (typeof size !== 'number') {
      throw new TypeError('Size of a string should be a number.')
    }

    const buf = rstream.readBuffer(size)
    decode.bytes += buf.length

    return buf.toString(encoding)
  }
}