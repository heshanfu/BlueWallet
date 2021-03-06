import React, { Component } from 'react';
import { FlatList, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlueLoading, SafeBlueArea, BlueCard, BlueListItem, BlueHeader } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let EV = require('../../events');
let loc = require('../../loc');

export default class ReceiveList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.receive.list.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons name={focused ? 'ios-cash' : 'ios-cash-outline'} size={26} style={{ color: tintColor }} />
    ),
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
    this.walletsCount = 0;
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => {
      return this.componentDidMount();
    });
  }

  async componentDidMount() {
    console.log('receive/list - componentDidMount');
    let list = [];

    this.walletsCount = 0;
    for (let w of BlueApp.getWallets()) {
      list.push({
        title: w.getAddress(),
        subtitle: w.getLabel(),
      });
      this.walletsCount++;
    }

    this.setState({
      isLoading: false,
      list: list,
      dataSource: list,
    });
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }}>
        <BlueHeader
          centerComponent={{
            text: loc.receive.list.header,
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
          }}
        />

        <BlueCard containerStyle={{ padding: 0 }}>
          <FlatList
            data={this.state.dataSource}
            style={Styles.flatList}
            renderItem={item => {
              return (
                <BlueListItem
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={() => {
                    navigate('ReceiveDetails', { address: item.title });
                  }}
                  leftIcon={{
                    name: 'bitcoin',
                    type: 'font-awesome',
                    color: BlueApp.settings.foregroundColor,
                  }}
                />
              );
            }}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

const Styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
});

ReceiveList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
