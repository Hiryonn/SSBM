SPEC = dict(
    name='Zelda', sheet='zeldassb.gif', credit='SemiJuggalo', sounds='Zelda', height=60,
    anims=dict(
        idle=['0.0', '0.1'], walk='0.2-0.9', run='4.1-4.4', crouch=['3.0'], jumpSquat=['3.0'],
        jump=['4.2'], doubleJump=['4.3', '4.4'], fall=['4.4'], land=['3.0'],
        shield=['8.5'], dodge=['1.5'], roll=['4.3', '4.4'], hurt=['6.3'], hurtAir=['6.4'], tumble=['6.3', '6.4'],
        lie=['7.0'], getup=['3.0'], taunt='1.5-1.8', win='8.0-8.4',
        jab=['5.0', '5.1'], ftilt=['5.1', '5.2'], utilt=['5.3'], dtilt=['3.0', '5.4'], dash=['4.4', '5.4'],
        fsmash=['5.0', '5.1', '5.5'], usmash=['6.0', '6.1'], dsmash=['6.2'],
        nair=['5.4', '5.5'], fair=['5.5'], uair=['6.1'], dair=['5.4'],
        neutralB=['6.0', '8.5', '6.1'], sideB=['5.0', '5.1'], upB=['1.5', '1.6'], downB=['2.4', '2.5'],
        grab=['5.1', '5.2'],
    ),
    times=dict(idle=20, walk=7, run=5, taunt=10, win=10, neutralB=[8, 12, 8], upB=[14, 10]),
    moves=dict(upB=dict(vy=-10, helpless=True, hit=dict(dmg=12)), neutralB=dict(hit=dict(dmg=11)), fsmash=dict(hit=dict(dmg=17))),
    stats=dict(weight=85, walkSpeed=1.1, runSpeed=2.4, jumpForce=8.0, doubleJumpForce=7.6, gravity=0.3),
)
