---
title: "Andromeda: Google's Network Virtualization Beneath the VPC You Think You See"
slug: "gcp-andromeda-network-virtualization"
description: "Singh et al. SIGCOMM: hoverboards, flow programming, and why GCP's VPC can be software without looking like a software switch on your VM."
publishedAt: "2026-09-13"
category: "Cloud"
tags:
  - Cloud
  - GCP
  - Networking
  - Virtualization
sources:
  - title: "Andromeda: Performance, Isolation, and Velocity at Scale in Cloud Network Virtualization"
    author: "Michael Dalton, David Schultz, Jacob Adriaens, Ahsan Arefin, Anshuman Gupta, Brian Fahs, Dima Rubinstein, Enrique Cauich Zermeno, Erik Rubow, James Alexander Docauer, Jesse Alpert, Jing Ai, Jon Olson, Kevin DeCabooter, Marc de Kruijf, Nan Hua, Nathan Lewis, Nikhil Kasinadhuni, Riccardo Crepaldi, Srinivas Krishnan, Subbaiah Venkata, Yossi Richter, Uday Naik, and Amin Vahdat"
    publisher: "NSDI 2018"
    url: "https://www.usenix.org/conference/nsdi18/presentation/dalton"
  - title: "Jupiter Rising"
    author: "Arjun Singh et al."
    publisher: "SIGCOMM 2015"
    url: "https://research.google/pubs/pub43837/"
---

Google Cloud's VPC feels like a network: IPs, firewalls, load balancers. Underneath, **Andromeda** (Dalton et al., NSDI 2018) is a network virtualization stack that programs host dataplanes so VMs do not share a Linux bridge the way early clouds did. Isolation and **velocity** (shipping network features without waiting on hypervisor upgrades the old way) are the paper's dual goals. You do not configure Andromeda. You still live with its consequences: encapsulation, host CPU for some paths, and firewall rules that are compiled into a distributed dataplane.

## Hoverboards and the host dataplane

Andromeda's generations moved work from slower software paths to faster ones, including offloads. Packets leave a VM, get encapsulated toward the physical fabric (Jupiter), and are switched on virtual network identifiers rather than on tenant VLANs of the 1990s. Firewall policies become **flow rules** on the host. A rule change is a control-plane push, not an iptables folk ritual on a shared box — unless you built that ritual in a GCE VM of your own.

```text
VM NIC → Andromeda dataplane (encap, firewall, metering) → datacenter fabric
```

Performance isolation matters: a noisy neighbor's flood should not steal your pps budget. The paper discusses rate limiting and datapath isolation. As a customer, you still see "egress throughput" caps in machine types; those caps are the productization of that isolation.

## Why this paper still helps an application engineer

Live migration, IP mobility, and load balancer VIP mapping are easier when the network is a program. The cost is **debugging**: packet mirrors, VPC Flow Logs, and firewall rule counters are how you see the virtual network. `tcpdump` inside the VM does not show Andromeda's drop. A SYN that dies in a deny rule never hits your process.

MTU and overlay overhead still surprise people who set 1500 and send jumbo payloads. Private Google Access and PSC are policy at this layer. You are not on "the internet"; you are on a programmed slice.

## Design-review translation

Do not assume east-west is free or that security groups on another cloud map 1:1. GCP's implied deny and hierarchical firewalls compile down to the same kind of host rules the paper describes. Burst CPU on the host from networking used to be more visible; offload reduced it, but small packets can still burn cycles.

Read Dalton et al. for the isolation-versus-velocity argument. Then, when a packet vanishes, start with VPC Flow Logs and firewall insights, not with a kernel module on the guest. The guest is not the switch.
