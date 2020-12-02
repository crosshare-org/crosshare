export const parse = async (cluedata: Buffer): Promise<void> => {
/*   with open(self._cluedata, 'rb') as f:
            numwords = struct.unpack('<I', f.read(4))[0]
            print("Initializing {0} words".format(numwords))

            for _ in range(numwords):
                l = struct.unpack('<B', f.read(1))[0]
                s = struct.unpack('<{}s'.format(l), f.read(l))[
                    0].decode('ascii')
                self.words.append([s, 0])
            self._clueblock = f.tell()
 */
  const numwords = cluedata.readInt32LE();
  console.log(`${numwords} words`);
};