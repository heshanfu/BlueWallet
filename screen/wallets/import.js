/* global alert */
import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDLegacyBreadwalletWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
} from '../../class';
import React, { Component } from 'react';
import { KeyboardAvoidingView, Dimensions, View } from 'react-native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueLoading,
  BlueSpacingVariable,
  BlueButton,
  SafeBlueArea,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { width } = Dimensions.get('window');

export default class WalletsImport extends Component {
  static navigationOptions = {
    tabBarVisible: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
      label: '',
    });
  }

  async _saveWallet(w) {
    alert(loc.wallets.import.success);
    w.setLabel(loc.wallets.import.imported + ' ' + w.getTypeReadable());
    BlueApp.wallets.push(w);
    await BlueApp.saveToDisk();
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    A(A.ENUM.CREATED_WALLET);
    setTimeout(() => {
      this.props.navigation.popToTop();
    }, 500);
  }

  async importMnemonic(text) {
    try {
      // is it lightning custodian?
      if (text.indexOf('blitzhub://') !== -1) {
        // yep its lnd
        for (let t of BlueApp.getWallets()) {
          if (t.type === new LightningCustodianWallet().type) {
            // already exist
            return alert('Only 1 Ligthning wallet allowed for now');
          }
        }

        let lnd = new LightningCustodianWallet();
        lnd.setSecret(text);
        await lnd.authorize();
        await lnd.fetchTransactions();
        await lnd.fetchBalance();
        return this._saveWallet(lnd);
      }

      // trying other wallet types

      let segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(text);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        let legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(text);

        await legacyWallet.fetchBalance();
        if (legacyWallet.getBalance() > 0) {
          // yep, its legacy we're importing
          await legacyWallet.fetchTransactions();
          return this._saveWallet(legacyWallet);
        } else {
          // by default, we import wif as Segwit P2SH
          await segwitWallet.fetchBalance();
          await segwitWallet.fetchTransactions();
          return this._saveWallet(segwitWallet);
        }
      }

      // if we're here - nope, its not a valid WIF

      let hd1 = new HDLegacyBreadwalletWallet();
      hd1.setSecret(text);
      if (hd1.validateMnemonic()) {
        await hd1.fetchBalance();
        if (hd1.getBalance() > 0) {
          await hd1.fetchTransactions();
          return this._saveWallet(hd1);
        }
      }

      let hd2 = new HDSegwitP2SHWallet();
      hd2.setSecret(text);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          await hd2.fetchTransactions();
          return this._saveWallet(hd2);
        }
      }

      let hd3 = new HDLegacyP2PKHWallet();
      hd3.setSecret(text);
      if (hd3.validateMnemonic()) {
        await hd3.fetchBalance();
        if (hd3.getBalance() > 0) {
          await hd3.fetchTransactions();
          return this._saveWallet(hd3);
        }
      }

      // no balances? how about transactions count?

      if (hd1.validateMnemonic()) {
        await hd1.fetchTransactions();
        if (hd1.getTransactions().length !== 0) {
          return this._saveWallet(hd1);
        }
      }
      if (hd2.validateMnemonic()) {
        await hd2.fetchTransactions();
        if (hd2.getTransactions().length !== 0) {
          return this._saveWallet(hd2);
        }
      }
      if (hd3.validateMnemonic()) {
        await hd3.fetchTransactions();
        if (hd3.getTransactions().length !== 0) {
          return this._saveWallet(hd3);
        }
      }

      // is it even valid? if yes we will import as:
      if (hd2.validateMnemonic()) {
        return this._saveWallet(hd2);
      }

      // not valid? maybe its a watch-only address?

      let watchOnly = new WatchOnlyWallet();
      watchOnly.setSecret(text);
      if (watchOnly.valid()) {
        await watchOnly.fetchTransactions();
        await watchOnly.fetchBalance();
        return this._saveWallet(watchOnly);
      }

      // nope?

      // TODO: try a raw private key
    } catch (Err) {
      console.warn(Err);
    }

    alert(loc.wallets.import.error);

    // Plan:
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO
  }

  setLabel(text) {
    this.setState({
      label: text,
    }); /* also, a hack to make screen update new typed text */
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <BlueLoading />
        </View>
      );
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1, paddingTop: 40 }}>
        <KeyboardAvoidingView behavior="position" enabled>
          <BlueSpacingVariable />
          <BlueHeaderDefaultSub leftText={loc.wallets.import.title} onClose={() => this.props.navigation.goBack()} />

          <BlueFormLabel>{loc.wallets.import.explanation}</BlueFormLabel>
          <BlueFormMultiInput
            value={this.state.label}
            placeholder={''}
            onChangeText={text => {
              this.setLabel(text);
            }}
          />

          <View
            style={{
              alignItems: 'center',
            }}
          >
            <BlueButton
              title={loc.wallets.import.do_import}
              buttonStyle={{
                width: width / 1.5,
              }}
              onPress={async () => {
                if (!this.state.label) {
                  return;
                }
                this.setState({ isLoading: true });
                setTimeout(async () => {
                  await this.importMnemonic(this.state.label.trim());
                  this.setState({ isLoading: false });
                }, 1);
              }}
            />

            <BlueButtonLink
              title={loc.wallets.import.scan_qr}
              onPress={() => {
                this.props.navigation.navigate('ScanQrWif');
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeBlueArea>
    );
  }
}

WalletsImport.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    popToTop: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
