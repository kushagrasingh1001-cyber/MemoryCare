import {Component} from 'react';
import {AlertTriangle,RefreshCw,Home} from 'lucide-react';

/**
 * Catches render errors so a single broken screen can never leave the user with
 * a blank white page (important for elderly users who cannot debug anything).
 */
export default class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('MemoryCare screen error',error,info);}
  render(){
    if(!this.state.error)return this.props.children;
    return <main className="page min-h-screen grid place-items-center">
      <section className="recovery-card recovery-warning">
        <span className="recovery-icon"><AlertTriangle size={30}/></span>
        <h1 className="text-2xl font-black">Something went wrong</h1>
        <p className="recovery-body">This screen could not be shown. Your saved data is safe.</p>
        <p className="recovery-code">{String(this.state.error?.message||this.state.error)}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button type="button" className="auth-primary" onClick={()=>{this.setState({error:null});location.reload();}}><RefreshCw size={18}/> Reload</button>
          <a className="auth-primary" href="/"><Home size={18}/> Go home</a>
        </div>
      </section>
    </main>;
  }
}
