import axios from 'axios'
import { useState } from 'react'
import { FaBrain } from 'react-icons/fa'
import { IoSend } from 'react-icons/io5'
import { TiDeleteOutline } from 'react-icons/ti'
import ReactMarkdown from 'react-markdown'
import { PuffLoader } from 'react-spinners'

interface IMessage {
  role: 'user' | 'assistant' | 'system'
  reason: boolean
  content: string
}

const ENDPOINT = 'http://localhost:11434/v1/chat/completions'
const DEFAULT_SETTINGS = {
  chat_model: 'deepseek-r1:8b',
  max_tokens: '0',
  temparature: '0.1',
  system_prompt: 'You are a helpful assistant.'
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [prompt, setPrompt] = useState('')
  const [reason, setReason] = useState(false)
  const [conversation, setConversation] = useState<IMessage[]>([])
  const [processing, setProcessing] = useState(false)

  const addSystemPromptOnce = () => {
    try {

      if (settings.system_prompt.length > 0) {
        if (conversation && conversation.length == 0) {
          setConversation(() => [{
            role: 'system',
            reason: reason,
            content: settings.system_prompt
          }])
          return
        }
        if (conversation && conversation.length > 0 && conversation[0].role !== 'system') {
          setConversation(() => [{
            role: 'system',
            reason: reason,
            content: settings.system_prompt
          }, ...conversation])
        }
        console.info(JSON.stringify(conversation, null, 2))
      }
    } catch (error) {
      console.error(error)
    }

  }


  const send = async () => {
    if (!processing && prompt.length > 0) {
      try {
        addSystemPromptOnce()
        let conv = [...conversation]
        conv.push({
          role: 'user',
          reason: reason,
          content: prompt
        })
        setConversation(conv)
        setProcessing(true)

        const payload = {
          messages: conv,
          model: settings.chat_model,
          temperature: parseFloat(settings.temparature),
          max_tokens: parseInt(settings.max_tokens)
        }

        console.info(JSON.stringify(payload, null, 2))
        const response = await axios.post(ENDPOINT, payload, {
          headers: {
            'Content-Type': 'application/json',
            //'api-key': API_KEY
          }
        })

        const data: any = response.data
        const answer = data.choices[0].message.content
        conv.push({
          role: 'assistant',
          reason: reason,
          content: answer
        })

        setConversation(conv)
        console.info(JSON.stringify(data, null, 2))
      } catch (error) {
        console.error(error)
      }
      finally {
        setProcessing(false)
        setPrompt('')
      }
    }
  }

  const clear = () => {
    setPrompt('')
    setConversation(() => [])
    addSystemPromptOnce()
  }

  const extractThink = (data: string): { think: string, content: string } => {
    if (data) {
      // data = '<think>This is a test</think> The answer is 42'
      try {
        const start = data.indexOf('<think>')
        const end = data.indexOf('</think>')
        if (start > -1 && end > -1) {
          const think = "Reasoning\n\n" + data.substring(start + 7, end)
          const content = data.substring(end + 8)
          return { think, content: content }
        }
      } catch (error) {
        console.error(error)
      }
    }
    return { think: '', content: data }
  }

  return (
    <>
      <div className='h-[35px] flex bg-slate-950 text-white items-center px-2'>
        <h1>DeepSeek Playground</h1>
      </div>
      <div className='h-[35px] flex bg-slate-900 items-center px-2 text-white gap-2'>
        <label>Model:</label>
        <input className='text-black px-1 w-36'
          value={settings.chat_model}
          onChange={(e) => setSettings({ ...settings, chat_model: e.currentTarget.value })}
        />
        <label>Tokens:</label>
        <input className='text-black px-1 w-20'
          value={settings.max_tokens}
          onChange={(e) => setSettings({ ...settings, max_tokens: e.currentTarget.value })}
        />
        <label>Temperature:</label>
        <input className='text-black px-1 w-20'
          value={settings.temparature}
          onChange={(e) => setSettings({ ...settings, temparature: e.currentTarget.value })}
        />
      </div>
      <div className='flex h-[calc(100vh-70px-35px)] text-white'>
        <aside className='w-1/4 bg-slate-700 p-2 flex flex-col gap-2'>
          <label>System prompt:</label>
          <textarea rows={5}
            onInput={(e) => setSettings({ ...settings, system_prompt: e.currentTarget.value })}
            value={settings.system_prompt}
            className='p-1 text-black outline-none resize-none'
          />
          <label>Conversations:</label>

        </aside>
        <main className='w-3/4 bg-slate-800 p-2'>
          <div className='h-[calc(100%-160px)] overflow-auto px-2 flex flex-col'>
            {conversation.map((message, idx) =>
              <div key={idx} className={'flex gap-2 mt-2 ' + (message.role === 'user' ? 'justify-end' : '')}>
                <div className={'rounded-md p-2 ' + (message.role === 'user' ? 'bg-blue-600' : 'bg-slate-600')}>
                  {message.reason && message.role === 'assistant' &&
                    <ReactMarkdown className="bg-green-200 text-black p-2 rounded-md">{extractThink(message.content).think}</ReactMarkdown>
                  }

                  {/* {processing && <label>Processing...</label>} */}
                  <ReactMarkdown>{extractThink(message.content).content}</ReactMarkdown>

                </div>
              </div>
            )}
            {processing &&
              <PuffLoader color='white' size={25} />
            }
          </div>
          <div className='h-[150px] bg-slate-900 flex p-2'>
            <textarea className='w-full outline-none resize-none text-black p-1'
              onChange={(e => setPrompt(e.currentTarget.value))}
              value={prompt}
            />
            <div className='flex flex-col gap-2 justify-center ml-2'>
              <button className='bg-blue-600 p-2'
                onClick={send}
                disabled={processing}
              ><IoSend /></button>
              <button className={'p-2 ' + (reason ? 'bg-green-600' : 'bg-slate-600')}
                onClick={() => setReason(!reason)}
                disabled={processing}
              ><FaBrain /></button>
              <button className='bg-red-600 p-2'
                onClick={clear}
                disabled={processing}
              ><TiDeleteOutline className='text-xl' /></button>
            </div>
          </div>
        </main>
      </div>
      <footer className='bg-slate-900 h-[35px] flex items-center text-white'>
        {processing &&
          <>
            <PuffLoader color='white' size={25}
            />
            <label> Processing...</label>
          </>

        }
      </footer>
    </>
  )
}

export default App
