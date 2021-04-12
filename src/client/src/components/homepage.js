import React, { Component } from 'react';
import Header from './shared/header.js'

class Home extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    const {userID} = this.props;
    return (<>
      <Header selectedPage="Home" userID={userID}/>
    </>);
  }
}

export default Home;