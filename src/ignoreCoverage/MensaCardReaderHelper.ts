//APDU Commands for reading Balance of the Card
import CardReader from './CardReader';

const chooseApplication = [
  0x90, 0x5a, 0x00, 0x00, 0x03, 0x5f, 0x84, 0x15, 0x00,
];
const readCurrentBalance = [0x90, 0x6c, 0x00, 0x00, 0x01, 0x01, 0x00];
const readLastTransaction = [0x90, 0xf5, 0x00, 0x00, 0x01, 0x01, 0x00];

/**
 * MensaCardReaderHelper for easy reading of the mensacard
 */
export default class MensaCardReaderHelper {
  static async readMensaCardInformations(cardReader: CardReader) {
    let answer;
    try {
      answer = await MensaCardReaderHelper.private_getMensaCardInformations(
        cardReader
      );
    } catch (err) {
      console.warn(err);
    }
    await MensaCardReaderHelper._cleanUp(cardReader); //fasdfasdf
    return answer;
  }

  /**
   * read the balance and the last Transaction from the Mensacard
   * @returns {Promise<{currentBalance: *, lastTransaction: *, readTime: Date}|{currentBalance: *, lastTransaction: string, readTime: Date}|undefined>}
   */
  static async private_getMensaCardInformations(cardReader: CardReader) {
    //request Mifare Technology
    console.log('MiFare Technology: ');
    const respTech = await MensaCardReaderHelper.private_requestTechnology(
      cardReader
    );
    console.log(JSON.stringify(respTech, null, 2));
    if (!respTech) {
      return undefined;
    }

    //Don't really know why we need the tag but it doesn't work without
    console.log('Tag: ');
    const tag = await cardReader.NfcManager.getTag();
    console.log(JSON.stringify(tag, null, 2));

    //sending APDU Command ChooseApplication for reading File containing the balance and last transaction
    console.log('Choose Application: ');
    let chooseAppResponse =
      await MensaCardReaderHelper.private_sendCommandToMensaCard(
        cardReader,
        chooseApplication
      );
    console.log(JSON.stringify(chooseAppResponse, null, 2));

    //if the response is Valid the current Balance APDU Command will be send
    if (MensaCardReaderHelper.private_isValidResponse(chooseAppResponse)) {
      console.log('Read Current Balance: ');
      let currentBalanceResponse =
        await MensaCardReaderHelper.private_sendCommandToMensaCard(
          cardReader,
          readCurrentBalance
        );
      console.log(JSON.stringify(currentBalanceResponse, null, 2));

      //if the response is Valid the lastTransaction APDU command is send
      if (
        MensaCardReaderHelper.private_isValidResponse(currentBalanceResponse)
      ) {
        let currentBalance = MensaCardReaderHelper.getValueFromBytes(
          currentBalanceResponse.slice(0, 4).reverse()
        ).toString();
        console.log('Read Last Transaction: ');
        let lastTransactionResponse =
          await MensaCardReaderHelper.private_sendCommandToMensaCard(
            cardReader,
            readLastTransaction
          );
        console.log(JSON.stringify(lastTransactionResponse, null, 2));

        //if the response is Valid the cardinformation is stored in a JSON Object and returned
        if (
          MensaCardReaderHelper.private_isValidResponse(lastTransactionResponse)
        ) {
          console.log('Get Value from Bytes: ');
          let lastTransaction = MensaCardReaderHelper.getValueFromBytes(
            lastTransactionResponse.slice(12, 14).reverse()
          ).toString();
          console.log('Last Transaction: ' + lastTransaction);
          let answer = {
            currentBalance: currentBalance,
            lastTransaction: lastTransaction,
            readTime: new Date(),
          };
          return answer;
          //else only the last Balance will be send back as A JSON Object
        } else {
          console.warn('LastTransactionResponse was not valid');
          let halfAnswer = {
            currentBalance: currentBalance,
            lastTransaction: 'Fehler',
            readTime: new Date(),
          };
          return halfAnswer;
        }
      }
    }
    //this only happens if something before failed or had a invalid answer
    console.warn('get Mensa Card Informations Failed');
    return undefined;
  }

  /**
   * return the Technology used to communicate with the NFC Card
   * @returns {string}
   */
  static private_getTechnology(cardReader: CardReader) {
    return cardReader.Platform.OS === 'ios'
      ? cardReader.NfcTech.MifareIOS
      : cardReader.NfcTech.IsoDep;
  }

  /**
   * function for Requesting the Permission to use the Technology
   * @returns {Promise<NfcTech|*|undefined>}
   */
  static async private_requestTechnology(cardReader) {
    try {
      let resp = await cardReader.NfcManager.requestTechnology(
        MensaCardReaderHelper.private_getTechnology(cardReader),
        {
          alertMessage: 'Place your phone on the card',
        }
      );
      return resp;
    } catch (err) {
      console.warn('request NFC Technology failed');
      console.warn(err);
    }
    return undefined;
  }

  /**
   * send Mifare APDU command to the NFC Card
   * @param command the APDU Command
   * @returns {Promise<number[]|undefined>}
   */
  static async private_sendCommandToMensaCard(cardReader: CardReader, command) {
    try {
      if (cardReader.Platform.OS === 'ios') {
        return await cardReader.NfcManager.sendMifareCommandIOS(command);
      } else {
        return await cardReader.NfcManager.transceive(command);
      }
    } catch (err) {
      console.warn(err);
      return undefined;
    }
  }

  /**
   * checking if the response of the Card is valid
   * @param resp response of the card
   * @returns {boolean|boolean}
   */
  static private_isValidResponse(resp) {
    if (resp) {
      return resp.length >= 2 && resp[resp.length - 2] === 145;
    }
    return false;
  }

  /**
   * function for converting byte array to the needed balance value
   * @param x
   * @returns {number}
   */
  static getValueFromBytes(x) {
    let val = 0;
    for (let i = 0; i < x.length; ++i) {
      val += x[i];
      if (i < x.length - 1) {
        val = val << 8;
      }
    }
    return val / 1000;
  }

  /**
   * function for Cleaning up the requests
   * @returns {Promise<void>}
   * @private
   */
  static async _cleanUp(cardReader: CardReader) {
    console.log('Clean Up');
    try {
      await cardReader.NfcManager.cancelTechnologyRequest();
      await cardReader.NfcManager.unregisterTagEvent();
      console.log('Success to cancelTechnologyRequest');
    } catch {
      console.warn('Clean Up failed');
    }
  }
}
