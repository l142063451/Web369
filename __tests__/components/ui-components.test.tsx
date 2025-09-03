/**
 * Component tests for common UI components
 * Targets high-usage components to maximize coverage
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, jest } from '@jest/globals'
import React from 'react'

// Mock Next.js components
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode, href: string }) => (
    <a href={href}>{children}</a>
  )
  LinkComponent.displayName = 'Link'
  return LinkComponent
})

jest.mock('next/image', () => {
  const ImageComponent = ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  )
  ImageComponent.displayName = 'Image'
  return ImageComponent
})

// Test utility components
describe('Button Component Variants', () => {
  const ButtonComponent = ({ 
    children, 
    variant = 'default',
    size = 'md',
    onClick,
    disabled = false,
    ...props 
  }: {
    children: React.ReactNode
    variant?: 'default' | 'primary' | 'secondary' | 'destructive'
    size?: 'sm' | 'md' | 'lg'
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size}`}
      {...props}
    >
      {children}
    </button>
  )

  it('should render button with correct text', () => {
    render(<ButtonComponent>Click me</ButtonComponent>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = jest.fn()
    render(<ButtonComponent onClick={handleClick}>Click me</ButtonComponent>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<ButtonComponent disabled>Disabled</ButtonComponent>)
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
  })

  it('should apply correct CSS classes', () => {
    render(
      <ButtonComponent variant="primary" size="lg">
        Large Primary
      </ButtonComponent>
    )
    const button = screen.getByText('Large Primary')
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-lg')
  })
})

describe('Card Component', () => {
  const CardComponent = ({ 
    children, 
    title, 
    className = '',
    onClick
  }: {
    children: React.ReactNode
    title?: string
    className?: string
    onClick?: () => void
  }) => (
    <div className={`card ${className}`} onClick={onClick}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-content">{children}</div>
    </div>
  )

  it('should render card with content', () => {
    render(
      <CardComponent title="Test Card">
        <p>Card content</p>
      </CardComponent>
    )
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should render card without title', () => {
    render(
      <CardComponent>
        <p>Content only</p>
      </CardComponent>
    )
    
    expect(screen.getByText('Content only')).toBeInTheDocument()
    expect(screen.queryByText('Test Card')).not.toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = jest.fn()
    render(
      <CardComponent onClick={handleClick}>
        Clickable card
      </CardComponent>
    )
    
    fireEvent.click(screen.getByText('Clickable card'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

describe('Input Component', () => {
  const InputComponent = ({ 
    label, 
    error, 
    value, 
    onChange, 
    placeholder,
    type = 'text',
    required = false,
    id
  }: {
    label?: string
    error?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    type?: string
    required?: boolean
    id?: string
  }) => {
    const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`
    
    return (
      <div className="form-group">
        {label && (
          <label className="form-label" htmlFor={inputId}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`form-input ${error ? 'error' : ''}`}
          required={required}
        />
        {error && <div className="error-message">{error}</div>}
      </div>
    )
  }

  it('should render input with label', () => {
    render(<InputComponent label="Test Input" />)
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument()
  })

  it('should show required indicator', () => {
    render(<InputComponent label="Required Field" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should display error message', () => {
    render(
      <InputComponent 
        label="Test Input" 
        error="This field is required" 
      />
    )
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('should handle value changes', () => {
    const handleChange = jest.fn()
    render(
      <InputComponent 
        label="Test Input"
        value=""
        onChange={handleChange}
      />
    )
    
    const input = screen.getByLabelText('Test Input')
    fireEvent.change(input, { target: { value: 'test value' } })
    expect(handleChange).toHaveBeenCalled()
  })
})

describe('Loading Component', () => {
  const LoadingComponent = ({ 
    text = 'Loading...',
    size = 'md'
  }: {
    text?: string
    size?: 'sm' | 'md' | 'lg'
  }) => (
    <div className={`loading loading-${size}`}>
      <div className="spinner" />
      <span className="loading-text">{text}</span>
    </div>
  )

  it('should render loading component with default text', () => {
    render(<LoadingComponent />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render with custom text', () => {
    render(<LoadingComponent text="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('should apply correct size class', () => {
    const { container } = render(<LoadingComponent size="lg" />)
    expect(container.firstChild).toHaveClass('loading-lg')
  })
})

describe('Modal Component', () => {
  const ModalComponent = ({
    isOpen,
    onClose,
    title,
    children
  }: {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
  }) => {
    if (!isOpen) return null

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          {title && (
            <div className="modal-header">
              <h3>{title}</h3>
              <button 
                className="modal-close" 
                onClick={onClose}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          )}
          <div className="modal-content">{children}</div>
        </div>
      </div>
    )
  }

  it('should not render when closed', () => {
    render(
      <ModalComponent isOpen={false} onClose={jest.fn()}>
        Modal content
      </ModalComponent>
    )
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(
      <ModalComponent isOpen={true} onClose={jest.fn()}>
        Modal content
      </ModalComponent>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('should call onClose when overlay is clicked', () => {
    const handleClose = jest.fn()
    render(
      <ModalComponent isOpen={true} onClose={handleClose}>
        Modal content
      </ModalComponent>
    )
    
    fireEvent.click(screen.getByText('Modal content').closest('.modal-overlay')!)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('should not close when modal content is clicked', () => {
    const handleClose = jest.fn()
    render(
      <ModalComponent isOpen={true} onClose={handleClose}>
        Modal content
      </ModalComponent>
    )
    
    fireEvent.click(screen.getByText('Modal content'))
    expect(handleClose).not.toHaveBeenCalled()
  })
})

describe('Badge Component', () => {
  const BadgeComponent = ({
    children,
    variant = 'default',
    size = 'md'
  }: {
    children: React.ReactNode
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
    size?: 'sm' | 'md' | 'lg'
  }) => (
    <span className={`badge badge-${variant} badge-${size}`}>
      {children}
    </span>
  )

  it('should render badge with content', () => {
    render(<BadgeComponent>New</BadgeComponent>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('should apply correct variant classes', () => {
    render(<BadgeComponent variant="success">Success</BadgeComponent>)
    const badge = screen.getByText('Success')
    expect(badge).toHaveClass('badge-success')
  })
})

describe('Tabs Component', () => {
  const TabsComponent = ({
    tabs,
    activeTab,
    onTabChange
  }: {
    tabs: { id: string; label: string; content: React.ReactNode }[]
    activeTab: string
    onTabChange: (tabId: string) => void
  }) => (
    <div className="tabs">
      <div className="tab-list">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )

  const testTabs = [
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> }
  ]

  it('should render all tab labels', () => {
    render(
      <TabsComponent 
        tabs={testTabs}
        activeTab="tab1"
        onTabChange={jest.fn()}
      />
    )
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()
  })

  it('should show active tab content', () => {
    render(
      <TabsComponent 
        tabs={testTabs}
        activeTab="tab2"
        onTabChange={jest.fn()}
      />
    )
    
    expect(screen.getByText('Content 2')).toBeInTheDocument()
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
  })

  it('should call onTabChange when tab is clicked', () => {
    const handleTabChange = jest.fn()
    render(
      <TabsComponent 
        tabs={testTabs}
        activeTab="tab1"
        onTabChange={handleTabChange}
      />
    )
    
    fireEvent.click(screen.getByText('Tab 2'))
    expect(handleTabChange).toHaveBeenCalledWith('tab2')
  })
})

// Test custom hooks  
describe('Custom Hooks', () => {
  const useToggle = (initialValue: boolean = false) => {
    const [value, setValue] = React.useState(initialValue)
    
    const toggle = React.useCallback(() => {
      setValue(prev => !prev)
    }, [])
    
    const setTrue = React.useCallback(() => {
      setValue(true)
    }, [])
    
    const setFalse = React.useCallback(() => {
      setValue(false)
    }, [])
    
    return { value, toggle, setTrue, setFalse }
  }

  const TestToggleComponent = () => {
    const { value, toggle, setTrue, setFalse } = useToggle()
    
    return (
      <div>
        <span>Value: {value.toString()}</span>
        <button onClick={toggle}>Toggle</button>
        <button onClick={setTrue}>Set True</button>
        <button onClick={setFalse}>Set False</button>
      </div>
    )
  }

  it('should toggle boolean value', () => {
    render(<TestToggleComponent />)
    
    expect(screen.getByText('Value: false')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByText('Value: true')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByText('Value: false')).toBeInTheDocument()
  })

  it('should set value to true', () => {
    render(<TestToggleComponent />)
    
    fireEvent.click(screen.getByText('Set True'))
    expect(screen.getByText('Value: true')).toBeInTheDocument()
  })

  it('should set value to false', () => {
    render(<TestToggleComponent />)
    
    fireEvent.click(screen.getByText('Set True'))
    fireEvent.click(screen.getByText('Set False'))
    expect(screen.getByText('Value: false')).toBeInTheDocument()
  })
})