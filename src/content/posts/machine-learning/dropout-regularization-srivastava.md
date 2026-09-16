---
title: "Dropout: Regularization by Silence, and Why It Still Shows Up in 2026 Training Runs"
slug: "dropout-regularization-srivastava"
description: "Srivastava et al. 2014: randomly dropping units as an ensemble trick, inverted dropout at inference, and when batch norm made the habit less automatic."
publishedAt: "2026-08-06"
category: "Machine Learning"
tags:
  - Machine Learning
  - Deep Learning
  - Regularization
  - Research
sources:
  - title: "Dropout: A Simple Way to Prevent Neural Networks from Overfitting"
    author: "Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever, Ruslan Salakhutdinov"
    publisher: "Journal of Machine Learning Research, 2014"
    url: "https://jmlr.org/papers/v15/srivastava14a.html"
---

Overfitting in large nets is easy: the model memorizes the training set's noise. Dropout's idea is almost rude. During training, each unit is kept with probability `p` and zeroed otherwise. The network cannot rely on a particular collaborator being present, so it learns redundant, more robust features. At test time you keep every unit and scale activations (or, in inverted dropout, you scale during training and leave inference as a straight multiply). The paper frames this as training a huge ensemble of subnetworks that share weights.

## Inverted dropout, the implementation everyone uses

```python
def dropout(x, p, training):
    if not training:
        return x
    mask = (np.random.rand(*x.shape) < p) / p
    return x * mask
```

Dividing by `p` in training keeps the expected activation the same as inference, so you do not need to multiply by `p` at test time. Getting this backwards is a silent accuracy drop when someone "simplifies" the code.

Typical `p` was 0.5 on hidden layers and closer to 1.0 (less dropout) on inputs. Those numbers were ImageNet/MNIST-era heuristics, not laws. Transformers often use dropout on attention weights and residual paths at much smaller rates, or drop entire residual blocks (stochastic depth), which is the same family of idea at a coarser grain.

## Dropout versus batch normalization

Batch norm already injects noise through minibatch statistics and, for a while, many vision pipelines dropped dropout because BN + heavy augmentation was enough. That does not mean dropout is obsolete. Language models, small-data classifiers, and networks without BN still use it. Combining both without thinking can over-regularize: train loss stays high, test is not better.

The paper's ensemble interpretation is the part to keep in interviews. You are not "adding noise for fun." You are preventing co-adaptation of features. If your regularization is already strong (weight decay, huge data, early stop, augmentation), extra dropout is a knob to measure, not a default checkbox from a 2014 tutorial.

When a training curve memorizes by epoch 3, dropout is still a cheap first experiment — after you have checked a data leak. Regularization will not save a leaked label.
