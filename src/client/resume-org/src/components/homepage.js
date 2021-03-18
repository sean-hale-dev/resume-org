import React, { Component } from 'react';
import Header from './shared/header.js'

class Home extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    return (<>
      <Header selectedPage="Home" />
    </>);
  }
}

export default Home;