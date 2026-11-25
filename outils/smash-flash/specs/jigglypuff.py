SPEC = dict(
    name='Jigglypuff', sheet='jiggle.gif', credit='SSF', face='left', sounds='Jigglypuff', height=34,
    anims=dict(
        idle=['0.0', '0.1'], walk='0.2-0.5', run=['0.6', '0.7', '0.8'], crouch=['0.10'], jumpSquat=['0.9'],
        jump=['0.11', '0.12'], doubleJump='0.13-0.16', fall=['0.13'], land=['0.9'],
        shield=['3.0'], dodge=['0.10'], roll='5.0-5.2', hurt=['4.0'], hurtAir=['4.1'], tumble=['5.0', '5.2', '6.0'],
        lie=['0.10'], getup=['0.9'], dizzy=['4.2'], taunt=['4.6'], win=['3.0'],
        jab=['2.0', '2.1'], ftilt=['2.2', '2.3'], utilt=['1.15'], dtilt=['0.17'], dash=['2.6'],
        fsmash=['2.7', '2.8'], usmash=['2.9'], dsmash=['2.5'],
        nair=['0.14', '0.15'], fair=['1.7'], uair=['1.8'], dair=['1.13'],
        neutralB=['5.0', '5.2', '6.0', '6.1', '7.0'], sideB=['8.0'], upB=['4.6'], downB=['4.7'],
        grab=['2.0', '2.1'],
    ),
    times=dict(idle=20, walk=8, run=5, doubleJump=5, neutralB=4, upB=[40], downB=[90], taunt=20),
    moves=dict(neutralB=dict(vx=7, hit=dict(dmg=11)), downB=dict(hit=dict(dmg=28, bkb=50, kbg=1.2)), upB=dict(vy=-2),
               sideB=dict(vx=3, hit=dict(dmg=10))),
    stats=dict(weight=68, walkSpeed=1.1, runSpeed=2.4, jumpForce=7.6, doubleJumpForce=6.6, jumps=6, gravity=0.28, fallSpeed=2.2),
)
