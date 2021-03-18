import React, { Component } from 'react';
import Header from './shared/header.js'

class Resume extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    return (<>
      <Header selectedPage="Your Resume" />
    </>);
  }
}

export default Resume;