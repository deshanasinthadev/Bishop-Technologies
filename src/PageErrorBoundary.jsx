import { Component } from 'react'

export class PageErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <section className="shell store-page" role="alert">
      <h2>{this.props.title}</h2>
      <p>Reload the page to try again.</p>
      <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>Reload page</button>
    </section>
  }
}
