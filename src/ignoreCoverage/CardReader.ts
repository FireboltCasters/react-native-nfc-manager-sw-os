import MensaCardReaderHelper from './MensaCardReaderHelper';

export default class CardReader {
  NfcManager: any;
  NfcTech: any;
  Platform: any;

  constructor(NfcManager: any, NfcTech: any, Platform: any) {
    this.NfcManager = NfcManager;
    this.NfcTech = NfcTech;
    this.Platform = Platform;
  }

  async isSupported() {
    return await this.NfcManager.isSupported();
  }

  async isEnabled() {
    return await this.NfcManager.isEnabled();
  }

  isApple() {
    return this.Platform.OS === 'ios';
  }

  async readCard() {
    let cardInformations;
    try {
      const result = await this.NfcManager.start();
      cardInformations = await MensaCardReaderHelper.readMensaCardInformations(
        this
      );
    } catch (err) {
      console.warn(err);
    }
    await MensaCardReaderHelper._cleanUp(this); //fasdfasdf
    return cardInformations;
  }
}
