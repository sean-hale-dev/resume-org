import React, { Component } from 'react';
import Header from './shared/header.js'

class Database extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    return (<>
      <Header selectedPage="Resume Database" />
    </>);
  }
}

export default Database;