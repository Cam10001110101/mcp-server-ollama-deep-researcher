# Research Workflow Diagram

This document illustrates the iterative research process used by the Ollama Deep Researcher.

## High-Level Process Flow

```mermaid
flowchart TD
    A[User Topic] --> B[Topic Analysis]
    B --> C[Query Creation]
    C --> D[Search Request]
    D --> E[Web Search]
    E --> F[Source Processing]
    F --> G[Summarization]
    G --> H[Gap Analysis]
    H --> I[New Queries]
    I --> D
    H --> J{Continue?}
    J -->|Yes| K[Final Summary]
    K --> L[Complete]
```

## Component Details

### 1. Initial Processing

```mermaid
flowchart LR
    A[Topic] --> B[LLM Analysis]
    B --> C[Search Query]
    B --> D[Identify Focus]
```

### 2. Search and Collection

```mermaid
flowchart LR
    A[Query] --> B[Search API]
    B --> C[Results]
    B --> D[Filter Relevance]
```

### 3. Processing Pipeline

```mermaid
flowchart LR
    A[Sources] --> B[Extract]
    B --> C[Analyze]
    C --> D[Synthesize]
    B --> E[Text]
    C --> F[Links]
    D --> G[Summary]
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> ANALYZING
    ANALYZING --> SEARCHING
    SEARCHING --> SUMMARIZING
    SUMMARIZING --> REFLECTING
    REFLECTING --> ANALYZING
    REFLECTING --> COMPLETED
    COMPLETED --> [*]
```

## Data Flow

### Input Processing

```mermaid
flowchart TD
    A[User Topic] --> B[Topic Analysis]
    B --> C[Query Generator]
    C --> D[Search APIs]
```

### Research Loop

```mermaid
flowchart TD
    subgraph Research Loop
        A[Query] --> B[Search]
        B --> C[Parse]
        C --> D[Summary]
        D --> E[Reflect]
        E --> F[Gaps]
        F --> A
    end
```

### Output Generation

```mermaid
flowchart TD
    A[Research Results] --> B[Markdown Generator]
    B --> C[Final Summary]
```

## Integration Points

### Ollama Integration

```mermaid
flowchart TD
    A[MCP Server] --> B[Ollama API]
    B --> C[LLM Process]
    A --> C
```

### Search API Integration

```mermaid
flowchart TD
    A[Query Builder] --> B[API Client]
    B --> C[Results Processor]
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Operation] --> B{Error Detected?}
    B -->|Yes| C[Retry Logic]
    C --> D[Error Response]
    B -->|No| E[Continue]
```

## Research Cycle Details

```mermaid
graph TD
    subgraph Research Cycle
        A[Initial Query] --> B[Web Search]
        B --> C[Process Sources]
        C --> D[Generate Summary]
        D --> E[Identify Gaps]
        E --> F[Refine Query]
        F --> B
    end

    subgraph Components
        G[Ollama LLM] --> A
        G --> D
        G --> E
        H[Search API] --> B
    end
```

## System Integration Overview

```mermaid
graph TD
    subgraph "Claude Desktop App"
        A[Claude Assistant] --> B[Task Planning]
        B --> C[Tool Selection]
        C --> D[Resource Selection]
        D --> E[Prompt Templates]
    end

    subgraph "MCP Client Layer"
        F[Tool Registry] --> G[Protocol Handler]
        G --> H[Server Manager]
        I[Resource Manager] --> G
        J[Prompt Manager] --> G
    end

    subgraph "MCP Server"
        K[Tools API] --> L[Research Controller]
        L --> M[Configuration Manager]
        L --> N[State Manager]
        O[Resource API] --> L
        P[Prompt API] --> L
    end

    subgraph "External Services"
        Q[Ollama] --> L
        R[Search APIs] --> L
    end

    %% Feature Support Flow
    C -->|"use_mcp_tool"| F
    D -->|"access_resource"| I
    E -->|"use_prompt"| J
    H -->|"Execute"| K
    H -->|"Read"| O
    H -->|"Get"| P

    %% Status Flow
    L -->|"Results"| H
    H -->|"Response"| C

    %% Feature Support Notes
    classDef support fill:#e1f3d8,stroke:#333
    classDef partial fill:#fff3cd,stroke:#333
    
    %% Full Support Features
    A:::support
    F:::support
    I:::support
    J:::support
    
    %% Notes
    classDef note fill:#f9f,stroke:#333,stroke-width:2px
    N1[Full MCP Feature Support]:::note
    N2[Protocol & Security Layer]:::note
    N3[Research Implementation]:::note
    
    A --- N1
    G --- N2
    L --- N3
```

## Orchestration Details

```mermaid
sequenceDiagram
    participant Claude as Claude Desktop App
    participant Client as MCP Client Layer
    participant Server as Research Controller
    participant Services as External Services

    Note over Claude,Client: Full Feature Support
    
    Claude->>Client: use_mcp_tool (research)
    activate Client
    
    Note over Client: Protocol Handling
    Client->>Server: Execute research tool
    activate Server
    
    rect rgb(200, 220, 255)
        Note right of Server: Research Loop
        Server->>Services: LLM Query Generation
        Services-->>Server: Query
        Server->>Services: Web Search
        Services-->>Server: Results
        Server->>Services: Summarization
        Services-->>Server: Summary
    end
    
    Server-->>Client: Progress Updates
    Client-->>Claude: Status & Resource Updates
    
    rect rgb(200, 220, 255)
        Note right of Server: Iteration
        Server->>Services: Gap Analysis
        Services-->>Server: New Queries
    end
    
    Server-->>Client: Final Results
    deactivate Server
    
    Note over Client: Security & Validation
    Client-->>Claude: Complete Research with Resources
    deactivate Client
    
    Note over Claude: Human Approval Required
```

## Feature Support Matrix

```mermaid
graph TD
    subgraph "MCP Feature Support"
        A[Resources] --> B{Client Type}
        C[Tools] --> B
        D[Prompts] --> B
        E[Sampling] --> B
        
        B -->|Full| F[Claude Desktop App]
        B -->|Partial| G[Other Clients]
        
        classDef full fill:#e1f3d8,stroke:#333
        classDef partial fill:#fff3cd,stroke:#333
        
        F:::full
        G:::partial
    end
```
