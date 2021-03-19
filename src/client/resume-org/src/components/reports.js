import React, { Component } from 'react';
import Header from './shared/header.js'

class Reports extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    return (<>
      <Header selectedPage="Reports" />
    </>);
  }
}

export default Reports;